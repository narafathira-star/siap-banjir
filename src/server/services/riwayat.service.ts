/**
 * Sequence diagram langkah 9: simpan kejadian risiko TINGGI sebagai riwayat
 * (Informasi kategori RIWAYAT_KEJADIAN).
 *
 * Satu entri per kab/kota per hari kalender di zona waktu kab/kota itu (WIB/WITA/WIT, D-060); desa/kelurahan yang terdeteksi TINGGI di
 * hari itu ditambahkan sebagai baris daftar (DECISIONS D-038). Penulisan diserialkan dengan
 * advisory lock PostgreSQL agar proses paralel (cron) tidak membuat entri ganda.
 */
import type { LevelRisiko } from "@prisma/client";
import { db } from "@/server/db";
import { formatJamZona, formatTanggalPanjang } from "@/lib/format";
import { jenisWilayah, kodeKabKota, leluhurKode } from "@/lib/kode-wilayah";
import { SUMBER_DETEKSI } from "@/lib/sumber-informasi";
import { rentangHariLokal, zonaWilayah, type ZonaWaktu } from "@/lib/zona-waktu";
import { informasiInputSchema } from "@/server/validators/konten";

export const AWALAN_JUDUL_RIWAYAT = "Risiko banjir TINGGI terdeteksi di";
const JUDUL_DAFTAR = "Desa/kelurahan yang terdeteksi:";
const CATATAN =
  "Catatan: ini adalah deteksi otomatis berdasarkan data cuaca Open-Meteo dan ambang batas risiko, bukan laporan kejadian banjir yang terverifikasi. Informasi resmi: BMKG dan BPBD setempat.";

export { SUMBER_DETEKSI };

/** "- Kelurahan Sukarasa, Kec. Tangerang (13:05 WIB): Risiko TINGGI karena …" */
export function barisDesa(labelDesa: string, waktu: Date, deskripsi: string, zona: ZonaWaktu) {
  return `- ${labelDesa} (${formatJamZona(waktu, zona)}): ${deskripsi}`;
}

export function susunIsiRiwayat(namaKabKota: string, waktu: Date, baris: string[], zona: ZonaWaktu) {
  return [
    `Siap Banjir mendeteksi risiko banjir TINGGI di ${namaKabKota} pada ${formatTanggalPanjang(waktu, zona)}.`,
    `${JUDUL_DAFTAR}\n${baris.join("\n")}`,
    CATATAN,
  ].join("\n\n");
}

/** Tambahkan desa ke isi riwayat yang sudah ada; null jika desa itu sudah tercantum. */
export function tambahkanDesaKeIsi(isi: string, labelDesa: string, baris: string): string | null {
  if (isi.includes(`\n- ${labelDesa} (`)) return null;
  const bagian = isi.split("\n\n");
  const i = bagian.findIndex((b) => b.startsWith(JUDUL_DAFTAR));
  if (i < 0) return `${isi}\n\n${JUDUL_DAFTAR}\n${baris}`;
  bagian[i] = `${bagian[i]}\n${baris}`;
  return bagian.join("\n\n");
}

export type HasilRiwayat = "dibuat" | "diperbarui" | false;

/** Simpan/perbarui riwayat kab/kota jika level TINGGI. Risiko simulasi tidak pernah ditulis (D-041). */
export async function simpanRiwayatRisikoTinggi(risiko: LevelRisiko): Promise<HasilRiwayat> {
  if (risiko.level !== "TINGGI" || risiko.simulasi) return false;
  const kodeKab = kodeKabKota(risiko.idWilayah);
  if (!kodeKab) return false;

  const leluhur = await db.wilayah.findMany({
    where: { idWilayah: { in: leluhurKode(risiko.idWilayah) } },
    select: { idWilayah: true, namaWilayah: true, level: true },
  });
  const nama = (level: string) => leluhur.find((w) => w.level === level)?.namaWilayah;
  const namaKab = nama("KABKOTA");
  if (!namaKab) return false;

  const desa = nama("DESA");
  const kec = nama("KECAMATAN");
  const labelDesa = desa
    ? `${jenisWilayah(risiko.idWilayah)} ${desa}${kec ? `, Kec. ${kec}` : ""}`
    : (kec ? `Kec. ${kec}` : namaKab);
  const zona = zonaWilayah(kodeKab);
  const baris = barisDesa(labelDesa, risiko.waktu, risiko.deskripsi, zona);
  const { awal, akhir } = rentangHariLokal(risiko.waktu, zona);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`riwayat:${kodeKab}:${awal.toISOString()}`}))`;

    const ada = await tx.informasi.findFirst({
      where: {
        idWilayah: kodeKab,
        kategori: "RIWAYAT_KEJADIAN",
        judul: { startsWith: AWALAN_JUDUL_RIWAYAT },
        tanggal: { gte: awal, lt: akhir },
      },
    });

    if (ada) {
      const isiBaru = tambahkanDesaKeIsi(ada.isi, labelDesa, baris);
      if (!isiBaru) return false;
      await tx.informasi.update({ where: { idInformasi: ada.idInformasi }, data: { isi: isiBaru } });
      return "diperbarui";
    }

    const data = informasiInputSchema.parse({
      idWilayah: kodeKab,
      kategori: "RIWAYAT_KEJADIAN",
      judul: `${AWALAN_JUDUL_RIWAYAT} ${namaKab}`,
      isi: susunIsiRiwayat(namaKab, risiko.waktu, [baris], zona),
      tanggal: risiko.waktu,
      sumberNama: SUMBER_DETEKSI.nama,
      sumberUrl: SUMBER_DETEKSI.url,
    });
    await tx.informasi.create({ data });
    return "dibuat";
  });
}
