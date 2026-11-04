import { UMUR_SEGARKAN_MS } from "@/lib/constants";
import { formatJamZona } from "@/lib/format";
import type { SumberData } from "@/lib/tipe-risiko";
import type { ZonaWaktu } from "@/lib/zona-waktu";

/** Hasil tombol Perbarui: kapan dicek dan data cuaca mana yang didapat (D-057). */
export type HasilCek = {
  dicek: Date;
  /** `waktuAmbilData` sebelum dan sesudah pengecekan (ISO). */
  waktuDataSebelum: string;
  waktuData: string;
  sumber: SumberData;
  /** Zona wilayah terpilih (D-060). */
  zona: ZonaWaktu;
};

/**
 * Teks hasil tombol Perbarui (D-057). Setiap jam mencantumkan zona wilayah (D-060, D-062):
 * - Ada data baru: "Data diperbarui pukul 06:26 WIT."
 * - Jam cek = jam data (menit yang sama): "Data sudah terbaru (06:11 WIT). Bisa diperbarui lagi pukul 06:26 WIT."
 * - Selain itu: "Sudah dicek 06:20 WIT · data terbaru dari 06:11 WIT. Data cuaca diambil ulang paling cepat
 *   15 menit sekali, berikutnya 06:26 WIT."
 * Jam berikutnya hanya untuk data cache; data cadangan/hemat kuota dijelaskan terpisah oleh `StatusData`.
 */
export function teksHasilCek({ dicek, waktuDataSebelum, waktuData, sumber, zona }: HasilCek) {
  const data = new Date(waktuData);
  const jamData = formatJamZona(data, zona);
  if (data.getTime() > new Date(waktuDataSebelum).getTime()) return `Data diperbarui pukul ${jamData}.`;
  const berikutnya = formatJamZona(new Date(data.getTime() + UMUR_SEGARKAN_MS), zona);
  const jamCek = formatJamZona(dicek, zona);
  if (jamCek === jamData) {
    const singkat = `Data sudah terbaru (${jamData}).`;
    return sumber === "cache" ? `${singkat} Bisa diperbarui lagi pukul ${berikutnya}.` : singkat;
  }
  const dasar = `Sudah dicek ${jamCek} · data terbaru dari ${jamData}.`;
  if (sumber !== "cache") return dasar;
  return `${dasar} Data cuaca diambil ulang paling cepat 15 menit sekali, berikutnya ${berikutnya}.`;
}
