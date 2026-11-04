/**
 * Rate limit sederhana (fixed window) di memori proses.
 * Cukup untuk satu instance; untuk deploy multi-instance ganti dengan store bersama (lihat DECISIONS D-019).
 */
type Jendela = { jumlah: number; reset: number };

export function buatRateLimiter({ maks, jendelaMs }: { maks: number; jendelaMs: number }) {
  const catatan = new Map<string, Jendela>();

  return function cek(kunci: string, sekarang = Date.now()): { ok: boolean; sisa: number; retryAfterDetik: number } {
    // Bersihkan entri kedaluwarsa sesekali agar Map tidak tumbuh tanpa batas.
    if (catatan.size > 10_000) {
      for (const [k, j] of catatan) if (j.reset <= sekarang) catatan.delete(k);
    }
    const j = catatan.get(kunci);
    if (!j || j.reset <= sekarang) {
      catatan.set(kunci, { jumlah: 1, reset: sekarang + jendelaMs });
      return { ok: true, sisa: maks - 1, retryAfterDetik: 0 };
    }
    if (j.jumlah >= maks) {
      return { ok: false, sisa: 0, retryAfterDetik: Math.ceil((j.reset - sekarang) / 1000) };
    }
    j.jumlah++;
    return { ok: true, sisa: maks - j.jumlah, retryAfterDetik: 0 };
  };
}
