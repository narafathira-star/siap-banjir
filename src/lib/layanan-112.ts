/**
 * Status Layanan Panggilan Darurat 112 per kab/kota (Portal 112 Komdigi).
 * Data dari `npm run data:112` → src/data/layanan-112.json; lihat DECISIONS D-042.
 */
import data from "@/data/layanan-112.json";
import { formatTanggalLokalPanjang } from "@/lib/format";

export type SumberData = { nama: string; url: string; keterangan: string };

type Entri = (typeof data.daftar)[number];

const PER_KODE = new Map<string, Entri>(data.daftar.map((e) => [e.idWilayah, e]));

export const SUMBER_LAYANAN_112: SumberData = {
  nama: "Portal Layanan Panggilan Darurat 112 (Komdigi)",
  url: data.sumber.url,
  keterangan: `data diambil ${formatTanggalLokalPanjang(data.diambilPada)}`,
};

export type StatusLayanan112 = {
  /** true hanya untuk status "Sudah Launching". */
  tersedia: boolean;
  /** Label status portal, atau null jika kab/kota tidak ada di peta portal. */
  statusLabel: string | null;
  tanggalLaunching: string | null;
};

export function statusLayanan112(idKabKota: string): StatusLayanan112 {
  const e = PER_KODE.get(idKabKota);
  if (!e) return { tersedia: false, statusLabel: null, tanggalLaunching: null };
  return { tersedia: e.status === 1, statusLabel: e.statusLabel, tanggalLaunching: e.tanggalLaunching };
}

/** Kalimat keterangan untuk kontak 112 di kab/kota tertentu. */
export function keteranganLayanan112(namaKabKota: string, s: StatusLayanan112) {
  if (s.tersedia) {
    return s.tanggalLaunching
      ? `Layanan 112 ${namaKabKota} sudah diluncurkan sejak ${formatTanggalLokalPanjang(s.tanggalLaunching)}.`
      : `Layanan 112 ${namaKabKota} sudah diluncurkan.`;
  }
  const status = s.statusLabel
    ? `Layanan 112 di ${namaKabKota} masih berstatus "${s.statusLabel}".`
    : `${namaKabKota} belum tercatat memiliki layanan 112.`;
  return `${status} Jika tidak tersambung, hubungi nomor darurat lain di bawah.`;
}
