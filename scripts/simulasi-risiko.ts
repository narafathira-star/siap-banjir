/**
 * Simulasi risiko SEDANG/TINGGI untuk menguji alur Bahaya tanpa menunggu hujan lebat.
 *
 *   npm run simulasi -- aktifkan <kodeWilayah> [TINGGI|SEDANG] [--hujan-24jam <mm>]
 *   npm run simulasi -- cari <kata kunci>
 *   npm run simulasi -- status
 *   npm run simulasi -- pulihkan <kodeWilayah>|--semua
 *
 * Cara kerja (DECISIONS D-041): ambang risiko TIDAK diubah. Script menyimpan nilai hujan 24 jam
 * simulasi (tabel SimulasiCuaca) yang benar-benar melewati ambang level tujuan. Saat risiko desa
 * dihitung (kunjungan halaman atau cron), nilai itu menggantikan data hujan asli lalu dinilai
 * dengan ambang yang berlaku. Kode boleh tingkat apa pun; simulasi berlaku untuk semua
 * desa/kelurahan di bawahnya. Hasilnya ditandai simulasi: judul notifikasi berlabel [SIMULASI],
 * tidak ditulis ke riwayat, dan tidak menahan (anti-spam) peringatan asli.
 *
 * PERHATIAN: pelanggan notifikasi aktif di wilayah itu akan menerima push sungguhan
 * (berlabel [SIMULASI]). Hanya untuk database lokal/pengembangan.
 */
import type { Prisma, TingkatRisiko } from "@prisma/client";
import { kodeValid } from "../src/lib/kode-wilayah";
import { db } from "../src/server/db";
import { ambilAmbangWilayah, hitungLevelRisiko, pilihAmbangEfektif } from "../src/server/services/risk.service";

function pastikanDatabaseLokal() {
  const url = process.env.DATABASE_URL ?? "";
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    // biarkan kosong → ditolak di bawah
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(host) && !process.argv.includes("--izinkan-remote")) {
    console.error(`Menolak: DATABASE_URL mengarah ke "${host || "?"}", bukan database lokal.`);
    console.error("Tambahkan --izinkan-remote jika Anda benar-benar yakin (misal database staging).");
    process.exit(1);
  }
}

/** Filter kode wilayah itu sendiri dan semua turunannya. */
function diBawah(kode: string): Prisma.StringFilter | string {
  return kode.split(".").length === 4 ? kode : { startsWith: `${kode}.` };
}

/**
 * Nilai hujan 24 jam default dari ambang yang berlaku untuk kode itu:
 * TINGGI = batas bawah TINGGI + 10 mm; SEDANG = tengah rentang SEDANG.
 */
function hujanDefault(ambang: Awaited<ReturnType<typeof ambilAmbangWilayah>>, level: TingkatRisiko) {
  const rentang = pilihAmbangEfektif(ambang).get("hujan_24jam") ?? [];
  const r = rentang.find((a) => a.levelRisiko === level);
  if (!r) return null;
  if (level === "TINGGI" || r.nilaiMaksimum == null) return r.nilaiMinimum + 10;
  return Math.round((r.nilaiMinimum + r.nilaiMaksimum) / 2);
}

async function aktifkan(kode: string, level: TingkatRisiko, hujanDiminta: number | null) {
  const wilayah = kodeValid(kode) ? await db.wilayah.findUnique({ where: { idWilayah: kode } }) : null;
  if (!wilayah) {
    console.error(`Wilayah "${kode}" tidak ditemukan. Cari kodenya: npm run simulasi -- cari <nama>`);
    process.exit(1);
  }

  const ambang = await ambilAmbangWilayah(kode);
  const hujan = hujanDiminta ?? hujanDefault(ambang, level);
  if (hujan == null) throw new Error(`Tidak ada ambang hujan_24jam level ${level} yang berlaku untuk ${kode}.`);

  // Pastikan nilai simulasi benar-benar menghasilkan level tujuan dengan ambang asli.
  const hasil = hitungLevelRisiko({ hujan_24jam: hujan, hujan_3hari: hujan }, ambang);
  if (hasil.level !== level) {
    const batas = (pilihAmbangEfektif(ambang).get("hujan_24jam") ?? []).find((a) => a.levelRisiko === level);
    throw new Error(
      `Hujan ${hujan} mm menghasilkan level ${hasil.level}, bukan ${level}. ` +
        (batas ? `Ambang ${level} hujan 24 jam: ${batas.nilaiMinimum}${batas.nilaiMaksimum != null ? `–${batas.nilaiMaksimum}` : "+"} mm.` : ""),
    );
  }

  await db.simulasiCuaca.upsert({
    where: { idWilayah: kode },
    create: { idWilayah: kode, hujan24Jam: hujan, levelTujuan: level },
    update: { hujan24Jam: hujan, levelTujuan: level, mulai: new Date() },
  });

  const pelanggan = await db.langgananNotifikasi.count({ where: { idWilayah: diBawah(kode), status: true } });
  console.log(`✔ Simulasi aktif untuk ${wilayah.namaLengkap}: hujan 24 jam ${hujan} mm → level ${level} menurut ambang asli.`);
  console.log(`  ${hasil.parameterPemicu.map((p) => `${p.parameter} = ${p.nilai} (${p.level})`).join(", ")}`);
  console.log("  Desa/kelurahan dengan ambang khusus dinilai dengan ambangnya sendiri.");
  if (wilayah.level === "DESA") console.log(`  Buka: http://localhost:3000/risiko?wilayah=${kode}`);
  else console.log("  Buka salah satu desa/kelurahan di wilayah ini di http://localhost:3000/risiko");
  console.log("  Atau jalankan cron (hanya desa/kelurahan yang punya pelanggan): npm run cron:lokal");
  if (pelanggan > 0) {
    console.warn(`⚠ ${pelanggan} perangkat berlangganan di wilayah ini dan akan menerima notifikasi push berlabel [SIMULASI].`);
  }
  console.log(`  Selesai menguji: npm run simulasi -- pulihkan ${kode}`);
}

async function pulihkan(kode: string | null) {
  const daftar = await db.simulasiCuaca.findMany({ where: kode ? { idWilayah: kode } : {} });
  if (daftar.length === 0) {
    console.log("Tidak ada simulasi aktif.");
    return;
  }
  for (const s of daftar) {
    const [risiko] = await db.$transaction([
      // Risiko simulasi beserta catatan notifikasinya (cascade). Risiko asli dan riwayat tidak
      // tersentuh; kunjungan berikutnya memakai lagi risiko asli dari data cuaca yang sama.
      db.levelRisiko.deleteMany({ where: { simulasi: true, idWilayah: diBawah(s.idWilayah) } }),
      db.simulasiCuaca.delete({ where: { idWilayah: s.idWilayah } }),
    ]);
    console.log(`✔ ${s.idWilayah}: simulasi dihapus, ${risiko.count} level risiko simulasi dibersihkan.`);
  }
}

async function cari(kataKunci: string) {
  const token = kataKunci.split(/\s+/).filter((t) => t.length >= 2);
  if (token.length === 0) throw new Error("Pakai: npm run simulasi -- cari <kata kunci>");
  const hasil = await db.wilayah.findMany({
    where: { aktif: true, AND: token.map((t) => ({ namaLengkap: { contains: t, mode: "insensitive" as const } })) },
    select: { idWilayah: true, namaLengkap: true },
    orderBy: { idWilayah: "asc" },
    take: 30,
  });
  if (hasil.length === 0) console.log("Tidak ditemukan.");
  for (const w of hasil) console.log(`  ${w.idWilayah.padEnd(14)} ${w.namaLengkap}`);
}

async function status() {
  const daftar = await db.simulasiCuaca.findMany({ include: { wilayah: { select: { namaLengkap: true } } } });
  console.log(daftar.length ? "Simulasi aktif:" : "Tidak ada simulasi aktif.");
  for (const s of daftar) {
    console.log(`  - ${s.idWilayah} (${s.wilayah.namaLengkap}): hujan 24 jam ${s.hujan24Jam} mm → ${s.levelTujuan}, sejak ${s.mulai.toISOString()}`);
  }
}

/** Ambil nilai opsi `--nama <nilai>` dan buang dari daftar argumen. */
function ambilOpsi(arg: string[], nama: string) {
  const i = arg.indexOf(nama);
  if (i < 0) return { nilai: null, sisa: arg };
  const nilai = arg[i + 1];
  if (nilai === undefined) throw new Error(`${nama} butuh nilai`);
  return { nilai, sisa: [...arg.slice(0, i), ...arg.slice(i + 2)] };
}

async function main() {
  pastikanDatabaseLokal();
  const semua = process.argv.slice(2).filter((a) => a !== "--izinkan-remote");
  const { nilai: hujanTeks, sisa } = ambilOpsi(semua, "--hujan-24jam");
  const [perintah, ...arg] = sisa;
  const [arg1, arg2] = arg;

  switch (perintah) {
    case "aktifkan": {
      if (!arg1) throw new Error("Pakai: npm run simulasi -- aktifkan <kodeWilayah> [TINGGI|SEDANG] [--hujan-24jam <mm>]");
      const level = (arg2 ?? "TINGGI").toUpperCase();
      if (level !== "TINGGI" && level !== "SEDANG") throw new Error("Level harus TINGGI atau SEDANG");
      const hujan = hujanTeks == null ? null : Number(hujanTeks.replace(",", "."));
      if (hujan != null && !(Number.isFinite(hujan) && hujan > 0 && hujan <= 1000)) {
        throw new Error("--hujan-24jam harus angka mm antara 0 dan 1000");
      }
      return aktifkan(arg1, level, hujan);
    }
    case "pulihkan":
      if (!arg1) throw new Error("Pakai: npm run simulasi -- pulihkan <kodeWilayah>|--semua");
      return pulihkan(arg1 === "--semua" ? null : arg1);
    case "cari":
      return cari(arg.join(" "));
    case "status":
      return status();
    default:
      console.log(
        "Perintah:\n  aktifkan <kodeWilayah> [TINGGI|SEDANG] [--hujan-24jam <mm>]\n  cari <kata kunci>\n  status\n  pulihkan <kodeWilayah>|--semua",
      );
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
