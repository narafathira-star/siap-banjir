import { formatTanggal, formatTanggalPanjang } from "@/lib/format";
import { zonaWilayah } from "@/lib/zona-waktu";

/**
 * Teks tanggal sebuah informasi. Selalu di zona waktu **lokasi entri** (`idWilayah` entri), bukan
 * zona wilayah yang dipilih pengguna: kejadian di Ternate pukul 00.30 WIT tetap bertanggal hari itu
 * walaupun pengguna memilih wilayah WIB (D-060, D-061).
 */
export function teksTanggalInformasi(opsi: { tanggal: Date; idWilayah: string | null; panjang?: boolean }) {
  const zona = zonaWilayah(opsi.idWilayah);
  return opsi.panjang ? formatTanggalPanjang(opsi.tanggal, zona) : formatTanggal(opsi.tanggal, zona);
}
