import type { KategoriInformasi } from "@prisma/client";
import { teksTanggalInformasi } from "@/lib/tanggal-informasi";

/**
 * Tanggal artikel umum = tanggal terbit; tanggal riwayat = tanggal kejadian, atau tanggal data
 * bila sumber resmi tidak menyebut tanggal kejadian (`dataPer`, D-059).
 * Label "Terbit"/"Data per" mencegah tanggal itu terbaca sebagai tanggal kejadian.
 */
export function TanggalInformasi({
  kategori,
  tanggal,
  idWilayah,
  dataPer = false,
  panjang = false,
}: {
  kategori: KategoriInformasi;
  tanggal: Date;
  /** Wilayah entri: tanggal dibaca di zona lokasi kejadian, bukan zona wilayah pengguna (D-061). */
  idWilayah: string | null;
  dataPer?: boolean;
  panjang?: boolean;
}) {
  const teks = teksTanggalInformasi({ tanggal, idWilayah, panjang });
  return (
    <span>
      {kategori === "UMUM" ? "Terbit " : dataPer ? "Data per " : null}
      <time dateTime={tanggal.toISOString()}>{teks}</time>
    </span>
  );
}
