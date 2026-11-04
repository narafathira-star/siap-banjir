/**
 * Seed Siap Banjir. Idempoten:
 *  1. Wilayah Indonesia dari prisma/data/wilayah.tsv.gz (upsert; kode yang hilang dinonaktifkan).
 *  2. Profil (deskripsi) wilayah rawan banjir.
 *  3. Konten (ambang, informasi, persiapan, rekomendasi) dikosongkan lalu diisi ulang.
 *     Riwayat otomatis dari aplikasi (Informasi berawalan "Risiko banjir TINGGI terdeteksi di") dipertahankan.
 * Jalankan: npm run db:seed
 */
import { db } from "../src/server/db";
import {
  tambahAmbang,
  tambahInformasi,
  tambahPersiapan,
  tambahRekomendasi,
  tambahWilayah,
  ubahWilayah,
} from "../src/server/services/content.service";
import { AWALAN_JUDUL_RIWAYAT, SUMBER_DETEKSI } from "../src/server/services/riwayat.service";
import { bacaDataWilayah } from "./data-wilayah";
import { ambangSeed, informasiSeed, persiapanSeed, profilWilayahSeed, rekomendasiSeed } from "./seed-data";

async function main() {
  const wilayah = bacaDataWilayah();
  const mulai = Date.now();
  const { disimpan, dinonaktifkan } = await tambahWilayah(wilayah, { nonaktifkanSisanya: true });
  console.log(`Wilayah: ${disimpan} disimpan, ${dinonaktifkan} dinonaktifkan (${((Date.now() - mulai) / 1000).toFixed(1)} dtk)`);

  for (const p of profilWilayahSeed) {
    const w = await db.wilayah.findUnique({ where: { idWilayah: p.idWilayah }, select: { namaWilayah: true } });
    if (w?.namaWilayah !== p.namaWilayah) {
      throw new Error(`Profil ${p.idWilayah}: nama "${p.namaWilayah}" tidak cocok dengan data Kemendagri "${w?.namaWilayah}"`);
    }
    await ubahWilayah(p.idWilayah, { deskripsi: p.deskripsi });
  }

  await db.$transaction([
    db.ambangRisiko.deleteMany(),
    db.informasi.deleteMany({ where: { NOT: { judul: { startsWith: AWALAN_JUDUL_RIWAYAT } } } }),
    db.persiapanDini.deleteMany(),
    db.rekomendasi.deleteMany(),
  ]);

  for (const a of ambangSeed) await tambahAmbang(a);
  for (const i of informasiSeed) await tambahInformasi(i);
  for (const p of persiapanSeed) await tambahPersiapan(p);
  for (const r of rekomendasiSeed) await tambahRekomendasi(r);
  // Riwayat otomatis dari sebelum kolom sumber ada (D-039).
  await db.informasi.updateMany({
    where: { judul: { startsWith: AWALAN_JUDUL_RIWAYAT }, sumberUrl: null },
    data: { sumberNama: SUMBER_DETEKSI.nama, sumberUrl: SUMBER_DETEKSI.url },
  });

  console.log(
    `Konten: ${profilWilayahSeed.length} profil wilayah, ${ambangSeed.length} ambang, ${informasiSeed.length} informasi, ` +
      `${persiapanSeed.length} persiapan, ${rekomendasiSeed.length} rekomendasi.`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
