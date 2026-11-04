/**
 * Konten: Wilayah, AmbangRisiko, Informasi, PersiapanDini, Rekomendasi.
 *
 * Fungsi baca (lihat*) dipakai halaman & API publik (GET).
 * Operasi tambah/ubah/hapus dari class diagram TIDAK diekspos sebagai halaman atau
 * API publik; hanya dipakai oleh prisma/seed.ts.
 */
import type { KategoriInformasi, TingkatRisiko } from "@prisma/client";
import { leluhurKode } from "@/lib/kode-wilayah";
import { db } from "@/server/db";
import { simpanWilayahMassal } from "@/server/services/wilayah.service";
import {
  ambangRisikoBaseSchema,
  ambangRisikoInputSchema,
  informasiInputSchema,
  persiapanDiniInputSchema,
  rekomendasiDasarSchema,
  rekomendasiInputSchema,
  type AmbangRisikoInput,
  type InformasiInput,
  type PersiapanDiniInput,
  type RekomendasiInput,
  type WilayahInput,
} from "@/server/validators/konten";

// ---------- Baca ----------

/**
 * Konten berlaku untuk wilayah itu dan diwariskan ke wilayah di bawahnya (desa ← kecamatan ←
 * kab/kota ← provinsi ← global). Yang paling spesifik tampil lebih dulu: kode yang lebih
 * panjang lebih besar secara leksikografis ("32.04.12" > "32.04"), jadi urut menurun.
 */
const spesifikDulu = { idWilayah: { sort: "desc", nulls: "last" } } as const;
const berlakuUntuk = (idWilayah?: string) => [
  { idWilayah: null },
  ...(idWilayah ? [{ idWilayah: { in: leluhurKode(idWilayah) } }] : []),
];

export async function lihatPersiapan(levelRisiko: TingkatRisiko, idWilayah?: string) {
  return db.persiapanDini.findMany({
    where: { levelRisiko, OR: berlakuUntuk(idWilayah) },
    orderBy: [spesifikDulu, { urutan: "asc" }],
  });
}

export async function lihatRekomendasi(levelRisiko: TingkatRisiko, idWilayah?: string) {
  return db.rekomendasi.findMany({
    where: { levelRisiko, OR: berlakuUntuk(idWilayah) },
    orderBy: [spesifikDulu, { urutan: "asc" }],
  });
}

/**
 * lihatInformasi(wilayah): artikel umum atau riwayat kejadian untuk semua wilayah.
 * Informasi milik wilayah terpilih atau leluhurnya (mis. kab/kota-nya) tampil lebih dulu.
 */
export async function lihatInformasi(opsi: { kategori?: KategoriInformasi; idWilayah?: string } = {}) {
  const daftar = await db.informasi.findMany({
    where: opsi.kategori ? { kategori: opsi.kategori } : undefined,
    orderBy: { tanggal: "desc" },
    include: { wilayah: { select: { idWilayah: true, namaWilayah: true } } },
  });
  if (!opsi.idWilayah) return daftar;
  const leluhur = new Set(leluhurKode(opsi.idWilayah));
  const milikWilayah = (i: (typeof daftar)[number]) => (i.idWilayah && leluhur.has(i.idWilayah) ? 0 : 1);
  return [...daftar].sort((a, b) => milikWilayah(a) - milikWilayah(b));
}

export async function lihatDetailInformasi(idInformasi: string) {
  return db.informasi.findUnique({
    where: { idInformasi },
    include: { wilayah: { select: { idWilayah: true, namaWilayah: true } } },
  });
}

// ---------- Wilayah ----------

/** tambahWilayah(): satu atau banyak wilayah Kemendagri (upsert; induk harus sudah ada). */
export async function tambahWilayah(input: WilayahInput | WilayahInput[], opsi?: { nonaktifkanSisanya?: boolean }) {
  return simpanWilayahMassal(Array.isArray(input) ? input : [input], opsi);
}

/** ubahWilayah(): hanya deskripsi yang bisa diubah; kode/nama/koordinat mengikuti data Kemendagri. */
export async function ubahWilayah(idWilayah: string, input: { deskripsi: string | null }) {
  return db.wilayah.update({ where: { idWilayah }, data: { deskripsi: input.deskripsi } });
}

/**
 * hapusWilayah(): dinonaktifkan, bukan dihapus, agar riwayat & langganan lama tetap utuh
 * (wilayah punya anak; penghapusan fisik akan melanggar hierarki).
 */
export async function hapusWilayah(idWilayah: string) {
  return db.wilayah.update({ where: { idWilayah }, data: { aktif: false } });
}

// ---------- AmbangRisiko ----------

export async function tambahAmbang(input: AmbangRisikoInput) {
  const data = ambangRisikoInputSchema.parse(input);
  return db.ambangRisiko.create({ data });
}

export async function ubahAmbang(idAmbang: string, input: Partial<AmbangRisikoInput>) {
  const lama = await db.ambangRisiko.findUniqueOrThrow({ where: { idAmbang } });
  const perubahan = ambangRisikoBaseSchema.partial().parse(input);
  // Validasi ulang gabungan data lama + baru agar rentang tetap konsisten.
  const data = ambangRisikoInputSchema.parse({ ...lama, ...perubahan });
  return db.ambangRisiko.update({ where: { idAmbang }, data });
}

export async function hapusAmbang(idAmbang: string) {
  return db.ambangRisiko.delete({ where: { idAmbang } });
}

// ---------- Informasi ----------

export async function tambahInformasi(input: InformasiInput) {
  const data = informasiInputSchema.parse(input);
  return db.informasi.create({ data });
}

export async function ubahInformasi(idInformasi: string, input: Partial<InformasiInput>) {
  const data = informasiInputSchema.partial().parse(input);
  return db.informasi.update({ where: { idInformasi }, data });
}

export async function hapusInformasi(idInformasi: string) {
  return db.informasi.delete({ where: { idInformasi } });
}

// ---------- PersiapanDini ----------

export async function tambahPersiapan(input: PersiapanDiniInput) {
  const data = persiapanDiniInputSchema.parse(input);
  return db.persiapanDini.create({ data });
}

export async function ubahPersiapan(idPersiapan: string, input: Partial<PersiapanDiniInput>) {
  const data = persiapanDiniInputSchema.partial().parse(input);
  return db.persiapanDini.update({ where: { idPersiapan }, data });
}

export async function hapusPersiapan(idPersiapan: string) {
  return db.persiapanDini.delete({ where: { idPersiapan } });
}

// ---------- Rekomendasi ----------

export async function tambahRekomendasi(input: RekomendasiInput) {
  const data = rekomendasiInputSchema.parse(input);
  return db.rekomendasi.create({ data });
}

export async function ubahRekomendasi(idRekomendasi: string, input: Partial<RekomendasiInput>) {
  const data = rekomendasiDasarSchema.partial().parse(input);
  return db.rekomendasi.update({ where: { idRekomendasi }, data });
}

export async function hapusRekomendasi(idRekomendasi: string) {
  return db.rekomendasi.delete({ where: { idRekomendasi } });
}
