/**
 * Anggaran kuota Open-Meteo gratis: 10.000 call/hari, 300.000/bulan (non-komersial).
 * Satu request (10 variabel, 5 hari, satu lokasi) = 1,0 call = satu baris DataCuaca,
 * sehingga pemakaian dihitung dari DataCuaca 24 jam terakhir (tanpa tabel tambahan).
 * Lihat docs/DECISIONS.md D-035.
 */
import { db } from "@/server/db";

export const KUOTA_HARIAN = 10_000;
/** Di atas angka ini, kunjungan halaman hanya memakai data tersimpan. */
export const BATAS_KUNJUNGAN = 9_000;
/** Cron boleh memakai sisa kuota sampai angka ini (notifikasi lebih penting daripada kunjungan). */
export const BATAS_CRON = 9_800;
/** Anggaran cron ±6.000/hari ÷ 48 putaran (tiap 30 menit). */
export const MAKS_SEL_PER_PUTARAN = 125;
/** DataCuaca lebih tua dari ini dihapus (beserta LevelRisiko & Notifikasi terkait). */
export const SIMPAN_DATA_CUACA_HARI = 3;

const SEHARI_MS = 24 * 60 * 60 * 1000;

export async function pemakaian24Jam(sekarang = new Date()) {
  return db.dataCuaca.count({ where: { waktuAmbil: { gt: new Date(sekarang.getTime() - SEHARI_MS) } } });
}

export async function bersihkanDataCuacaLama(sekarang = new Date()) {
  const hasil = await db.dataCuaca.deleteMany({
    where: { waktuAmbil: { lt: new Date(sekarang.getTime() - SIMPAN_DATA_CUACA_HARI * SEHARI_MS) } },
  });
  return hasil.count;
}
