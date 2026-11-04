/**
 * Preferensi wilayah perangkat. Disimpan di localStorage (sumber utama di browser)
 * dan cookie (agar server component bisa langsung merender wilayah terpilih).
 * Sinkronisasi ke server (Pengguna.wilayahPreferensi) ditambahkan di Fase 3.
 */
export const KUNCI_WILAYAH = "siapbanjir_wilayah";
const SATU_TAHUN = 60 * 60 * 24 * 365;

export function bacaWilayahLokal(): string | null {
  try {
    return window.localStorage.getItem(KUNCI_WILAYAH);
  } catch {
    return null;
  }
}

export function bacaCookieWilayah(): string | null {
  const baris = document.cookie.split("; ").find((c) => c.startsWith(`${KUNCI_WILAYAH}=`));
  return baris ? decodeURIComponent(baris.split("=")[1] ?? "") : null;
}

export function simpanWilayahLokal(idWilayah: string) {
  try {
    window.localStorage.setItem(KUNCI_WILAYAH, idWilayah);
  } catch {
    // localStorage bisa diblokir (mode privat); cookie tetap dipakai.
  }
  document.cookie = `${KUNCI_WILAYAH}=${encodeURIComponent(idWilayah)}; path=/; max-age=${SATU_TAHUN}; samesite=lax`;
}
