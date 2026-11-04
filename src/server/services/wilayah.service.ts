/**
 * Wilayah administrasi Indonesia (Kemendagri 2025): Provinsi → Kab/Kota → Kecamatan → Desa/Kelurahan.
 * Unit yang dipantau (cuaca, risiko, langganan) adalah desa/kelurahan.
 */
import { Prisma, type TingkatWilayah, type Wilayah } from "@prisma/client";
import { KONTAK_BPBD } from "@/data/kontak-bpbd";
import { NOMOR_NASIONAL } from "@/data/nomor-nasional";
import { formatTanggalLokalPanjang } from "@/lib/format";
import { titikGrid } from "@/lib/grid";
import { susunNomorDarurat, type KontakDarurat, type NomorDarurat } from "@/lib/kontak-darurat";
import { keteranganLayanan112, statusLayanan112, SUMBER_LAYANAN_112 } from "@/lib/layanan-112";
import { jarakKm } from "@/lib/geo";
import { indukKode, jenisWilayah, leluhurKode, levelKode } from "@/lib/kode-wilayah";
import { db } from "@/server/db";
import { wilayahInputSchema, type WilayahInput } from "@/server/validators/konten";

export type RingkasWilayah = { idWilayah: string; namaWilayah: string; level: TingkatWilayah };

const RINGKAS = { idWilayah: true, namaWilayah: true, level: true } as const;

// ---------- Baca ----------

/** Anak langsung suatu wilayah (null = daftar provinsi), urut nama. */
export async function anakWilayah(idInduk: string | null): Promise<RingkasWilayah[]> {
  return db.wilayah.findMany({
    where: idInduk ? { idInduk, aktif: true } : { level: "PROVINSI", aktif: true },
    select: RINGKAS,
    orderBy: { namaWilayah: "asc" },
  });
}

/** Wilayah beserta leluhurnya (provinsi → … → wilayah itu sendiri). */
export async function lihatWilayahLengkap(idWilayah: string) {
  const baris = await db.wilayah.findMany({ where: { idWilayah: { in: leluhurKode(idWilayah) } } });
  const urut = baris.sort((a, b) => a.idWilayah.length - b.idWilayah.length);
  const wilayah = urut.at(-1);
  if (!wilayah || wilayah.idWilayah !== idWilayah) return null;
  return { wilayah, leluhur: urut };
}

export type WilayahLengkap = NonNullable<Awaited<ReturnType<typeof lihatWilayahLengkap>>>;

/** Desa/kelurahan yang bisa dipantau. */
export async function lihatDesa(idWilayah: string) {
  const hasil = await lihatWilayahLengkap(idWilayah);
  return hasil && hasil.wilayah.level === "DESA" && hasil.wilayah.aktif ? hasil : null;
}

/** "Kelurahan Sukarasa, Kota Tangerang" (desa + kab/kota) untuk judul & notifikasi. */
export function namaTampilan(leluhur: Pick<Wilayah, "idWilayah" | "namaWilayah" | "level">[]) {
  const desa = leluhur.find((w) => w.level === "DESA");
  const kab = leluhur.find((w) => w.level === "KABKOTA");
  const utama = desa ? `${jenisWilayah(desa.idWilayah)} ${desa.namaWilayah}` : leluhur.at(-1)?.namaWilayah ?? "";
  return kab ? `${utama}, ${kab.namaWilayah}` : utama;
}

/** "Kec. Tangerang, Kota Tangerang, Banten" untuk baris kedua. */
export function namaInduk(leluhur: Pick<Wilayah, "namaWilayah" | "level">[]) {
  return leluhur
    .filter((w) => w.level !== "DESA")
    .reverse()
    .map((w) => (w.level === "KECAMATAN" ? `Kec. ${w.namaWilayah}` : w.namaWilayah))
    .join(", ");
}

export type HasilPencarian = { idWilayah: string; namaWilayah: string; jenis: string; namaLengkap: string };

/** Token pencarian: huruf/angka, minimal 2 karakter, maksimal 5 kata. */
export function tokenPencarian(q: string) {
  return q
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
    .slice(0, 5);
}

/**
 * Cari desa/kelurahan: semua kata harus muncul di nama lengkap (desa, kecamatan, kab/kota, provinsi).
 * ILIKE memakai index trigram (pg_trgm). Nama desa yang diawali kata pertama tampil lebih dulu.
 */
export async function cariDesa(q: string, batas = 20): Promise<HasilPencarian[]> {
  const token = tokenPencarian(q);
  if (token.length === 0) return [];
  const kandidat = await db.wilayah.findMany({
    where: {
      level: "DESA",
      aktif: true,
      AND: token.map((t) => ({ namaLengkap: { contains: t, mode: "insensitive" as const } })),
    },
    select: { idWilayah: true, namaWilayah: true, namaLengkap: true },
    take: 200,
  });
  const pertama = token[0] as string;
  const skor = (w: (typeof kandidat)[number]) => {
    const nama = w.namaWilayah.toLowerCase();
    return (nama === pertama ? 0 : nama.startsWith(pertama) ? 1 : nama.includes(pertama) ? 2 : 3) * 1000 + w.namaLengkap.length;
  };
  return kandidat
    .sort((a, b) => skor(a) - skor(b))
    .slice(0, batas)
    .map((w) => ({ ...w, jenis: jenisWilayah(w.idWilayah) }));
}

/**
 * Desa/kelurahan terdekat dari titik GPS (jarak ke centroid). Kotak pencarian diperluas bertahap
 * sampai ada kandidat. Koordinat pengguna tidak disimpan.
 */
export async function desaTerdekat(lat: number, lng: number) {
  for (const radius of [0.05, 0.15, 0.5, 1.5]) {
    const kandidat = await db.wilayah.findMany({
      where: {
        level: "DESA",
        aktif: true,
        koordinatLatitude: { gte: lat - radius, lte: lat + radius },
        koordinatLongitude: { gte: lng - radius, lte: lng + radius },
      },
      select: { idWilayah: true, namaWilayah: true, koordinatLatitude: true, koordinatLongitude: true, koordinatPerkiraan: true },
    });
    // Utamakan centroid asli; centroid perkiraan (milik kecamatan) hanya jika tidak ada yang lain.
    const asli = kandidat.filter((k) => !k.koordinatPerkiraan);
    const pilihan = asli.length ? asli : kandidat;
    let terbaik: { idWilayah: string; jarakKm: number } | null = null;
    for (const k of pilihan) {
      const jarak = jarakKm(lat, lng, k.koordinatLatitude, k.koordinatLongitude);
      if (!terbaik || jarak < terbaik.jarakKm) terbaik = { idWilayah: k.idWilayah, jarakKm: jarak };
    }
    if (terbaik) return terbaik;
  }
  return null;
}

type TingkatPemilih = "provinsi" | "kabkota" | "kecamatan" | "desa";

/** Daftar untuk pemilih bertingkat: provinsi, dan anak dari tiap leluhur wilayah terpilih. */
export async function dataPemilih(idWilayah: string | null): Promise<{
  pilihan: Record<TingkatPemilih, string | null>;
  daftar: Record<TingkatPemilih, RingkasWilayah[]>;
}> {
  const kode: (string | undefined)[] = idWilayah ? leluhurKode(idWilayah) : [];
  const [provinsi, kabkota, kecamatan, desa] = await Promise.all([
    anakWilayah(null),
    kode[0] ? anakWilayah(kode[0]) : [],
    kode[1] ? anakWilayah(kode[1]) : [],
    kode[2] ? anakWilayah(kode[2]) : [],
  ]);
  return {
    pilihan: { provinsi: kode[0] ?? null, kabkota: kode[1] ?? null, kecamatan: kode[2] ?? null, desa: kode[3] ?? null },
    daftar: { provinsi, kabkota, kecamatan, desa },
  };
}

export type DataPemilih = Awaited<ReturnType<typeof dataPemilih>>;

// ---------- Kontak darurat ----------

/** Nomor nasional bersumber resmi (src/data/nomor-nasional.ts, D-051); nama & deskripsi mengikuti board (D-050). */
const KONTAK_NASIONAL: KontakDarurat[] = NOMOR_NASIONAL.map((k) => ({ ...k }));

type LeluhurKontak = Pick<Wilayah, "idWilayah" | "namaWilayah" | "level">[];

/**
 * Nomor darurat nasional + BPBD setempat.
 * - 112 diberi keterangan status layanan di kab/kota itu (Portal 112 Komdigi, D-042).
 * - Nomor BPBD hanya dari KONTAK_BPBD yang bersumber resmi; selain itu null (D-007, D-043).
 * Kota/kabupaten administrasi DKI Jakarta tidak punya BPBD sendiri → BPBD Provinsi.
 */
export function kontakDaruratWilayah(leluhur: LeluhurKontak): KontakDarurat[] {
  const prov = leluhur.find((w) => w.level === "PROVINSI");
  const kab = leluhur.find((w) => w.level === "KABKOTA");

  const nasional: KontakDarurat[] = KONTAK_NASIONAL.map((k) =>
    k.id === "112" && kab
      ? { ...k, keterangan: keteranganLayanan112(kab.namaWilayah, statusLayanan112(kab.idWilayah)), sumber: SUMBER_LAYANAN_112 }
      : k,
  );

  // BPBD kab/kota lalu BPBD provinsi; DKI Jakarta hanya punya BPBD provinsi.
  const pemilikBpbd = [...(kab && prov?.idWilayah !== "31" ? [kab] : []), ...(prov ? [prov] : [])];
  return [...nasional, ...pemilikBpbd.map(kontakBpbd)];
}

/** Halaman Nomor Darurat: kontak wilayah disusun menjadi nomor utama + lainnya (D-050). */
export function nomorDaruratWilayah(leluhur: LeluhurKontak): NomorDarurat {
  const kab = leluhur.find((w) => w.level === "KABKOTA");
  return susunNomorDarurat(
    kontakDaruratWilayah(leluhur),
    kab ? { tersedia: statusLayanan112(kab.idWilayah).tersedia, namaKabKota: kab.namaWilayah } : null,
  );
}

function kontakBpbd(w: Pick<Wilayah, "idWilayah" | "namaWilayah" | "level">): KontakDarurat {
  const provinsi = w.level === "PROVINSI";
  const dasar = {
    id: provinsi ? "bpbd-provinsi" : "bpbd-kabkota",
    nama: provinsi ? `BPBD Provinsi ${w.namaWilayah}` : `BPBD ${w.namaWilayah}`,
    deskripsi: "Badan Penanggulangan Bencana Daerah",
  };
  const k = KONTAK_BPBD[w.idWilayah];
  if (!k) return { ...dasar, telepon: null };
  return {
    ...dasar,
    telepon: k.telepon,
    ...(k.keterangan ? { keterangan: k.keterangan } : {}),
    sumber: { nama: k.sumberNama, url: k.sumberUrl, keterangan: `diperiksa ${formatTanggalLokalPanjang(k.diperiksaPada)}` },
  };
}

// ---------- Tulis (hanya seed/import; tidak diekspos) ----------

type BarisSiap = {
  idWilayah: string;
  namaWilayah: string;
  level: TingkatWilayah;
  idInduk: string | null;
  namaLengkap: string;
  koordinatLatitude: number;
  koordinatLongitude: number;
  koordinatPerkiraan: boolean;
  kunciGrid: string | null;
};

/**
 * Siapkan baris wilayah (level, induk, nama lengkap, sel grid) dari data dasar.
 * `namaDikenal` berisi nama wilayah lain (leluhur) untuk menyusun nama lengkap.
 */
export function siapkanBarisWilayah(input: WilayahInput, namaDikenal: Map<string, string>): BarisSiap {
  const d = wilayahInputSchema.parse(input);
  const level = levelKode(d.idWilayah);
  const namaLengkap = leluhurKode(d.idWilayah)
    .reverse()
    .map((k) => (k === d.idWilayah ? d.namaWilayah : namaDikenal.get(k)))
    .filter(Boolean)
    .join(", ");
  return {
    idWilayah: d.idWilayah,
    namaWilayah: d.namaWilayah,
    level,
    idInduk: indukKode(d.idWilayah),
    namaLengkap,
    koordinatLatitude: d.koordinatLatitude,
    koordinatLongitude: d.koordinatLongitude,
    koordinatPerkiraan: d.koordinatPerkiraan,
    kunciGrid: level === "DESA" ? titikGrid(d.koordinatLatitude, d.koordinatLongitude).kunciGrid : null,
  };
}

/**
 * Upsert massal (tambahWilayah/ubahWilayah untuk data Kemendagri). Induk harus sudah ada atau ikut
 * di `input`. Jika `nonaktifkanSisanya`, wilayah yang tidak ada di input ditandai aktif = false
 * (tidak dihapus agar riwayat & langganan lama tetap utuh).
 */
export async function simpanWilayahMassal(input: WilayahInput[], opsi: { nonaktifkanSisanya?: boolean } = {}) {
  const nama = new Map(input.map((w) => [w.idWilayah, w.namaWilayah]));
  const kurang = new Set(input.flatMap((w) => leluhurKode(w.idWilayah)).filter((k) => !nama.has(k)));
  if (kurang.size) {
    for (const w of await db.wilayah.findMany({ where: { idWilayah: { in: [...kurang] } }, select: { idWilayah: true, namaWilayah: true } })) {
      nama.set(w.idWilayah, w.namaWilayah);
    }
  }

  // Induk lebih dulu (foreign key id_induk).
  const baris = input
    .map((w) => siapkanBarisWilayah(w, nama))
    .sort((a, b) => a.idWilayah.split(".").length - b.idWilayah.split(".").length || a.idWilayah.localeCompare(b.idWilayah));

  const UKURAN = 1000;
  for (let i = 0; i < baris.length; i += UKURAN) {
    const nilai = baris.slice(i, i + UKURAN).map(
      (b) => Prisma.sql`(${b.idWilayah}, ${b.namaWilayah}, ${b.level}::"TingkatWilayah", ${b.idInduk}, ${b.namaLengkap},
        ${b.koordinatLatitude}, ${b.koordinatLongitude}, ${b.koordinatPerkiraan}, ${b.kunciGrid}, true)`,
    );
    await db.$executeRaw`
      INSERT INTO wilayah (id_wilayah, nama_wilayah, level, id_induk, nama_lengkap,
        koordinat_latitude, koordinat_longitude, koordinat_perkiraan, kunci_grid, aktif)
      VALUES ${Prisma.join(nilai)}
      ON CONFLICT (id_wilayah) DO UPDATE SET
        nama_wilayah = EXCLUDED.nama_wilayah, level = EXCLUDED.level, id_induk = EXCLUDED.id_induk,
        nama_lengkap = EXCLUDED.nama_lengkap, koordinat_latitude = EXCLUDED.koordinat_latitude,
        koordinat_longitude = EXCLUDED.koordinat_longitude, koordinat_perkiraan = EXCLUDED.koordinat_perkiraan,
        kunci_grid = EXCLUDED.kunci_grid, aktif = true`;
  }

  let dinonaktifkan = 0;
  if (opsi.nonaktifkanSisanya) {
    dinonaktifkan = await db.$executeRaw`
      UPDATE wilayah SET aktif = false WHERE aktif AND NOT (id_wilayah = ANY(${baris.map((b) => b.idWilayah)}))`;
  }
  return { disimpan: baris.length, dinonaktifkan };
}
