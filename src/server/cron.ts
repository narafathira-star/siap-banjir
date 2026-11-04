import { createHash, timingSafeEqual } from "node:crypto";

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/**
 * Cek header `Authorization: Bearer ${CRON_SECRET}`.
 * Perbandingan constant-time; secret kosong/tidak diatur selalu ditolak.
 */
export function otorisasiCron(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !authorization?.startsWith("Bearer ")) return false;
  return timingSafeEqual(sha256(authorization.slice("Bearer ".length)), sha256(secret));
}

/** Jalankan `fn` untuk setiap item dengan paralelisme terbatas, urutan hasil dipertahankan. */
export async function petakanTerbatas<T, H>(items: T[], batas: number, fn: (item: T) => Promise<H>): Promise<H[]> {
  const hasil: H[] = new Array(items.length);
  let berikutnya = 0;
  const pekerja = Array.from({ length: Math.min(batas, items.length) }, async () => {
    while (berikutnya < items.length) {
      const i = berikutnya++;
      hasil[i] = await fn(items[i] as T);
    }
  });
  await Promise.all(pekerja);
  return hasil;
}
