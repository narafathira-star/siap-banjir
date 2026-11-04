import { BUKU_SAKU_BNPB, sumberBukuSaku } from "./buku-saku-bnpb";

/**
 * Nomor darurat nasional (D-050, D-051). Setiap nomor wajib tercantum di minimal satu sumber
 * resmi di SUMBER_NOMOR_NASIONAL (diuji). Urutan = urutan tampil: 115 (SAR, evakuasi) paling
 * atas setelah 112 karena relevan untuk banjir.
 */
export const NOMOR_NASIONAL = [
  { id: "112", nama: "Layanan darurat terpadu", deskripsi: "Nomor darurat nasional", telepon: "112" },
  { id: "115", nama: "Basarnas", deskripsi: "Pencarian & pertolongan (SAR)", telepon: "115" },
  { id: "117", nama: "Call Center BNPB", deskripsi: "Badan Nasional Penanggulangan Bencana", telepon: "117" },
  { id: "110", nama: "Kepolisian", deskripsi: "Polisi", telepon: "110" },
  { id: "119", nama: "Ambulans", deskripsi: "Layanan kesehatan", telepon: "119" },
  { id: "113", nama: "Pemadam Kebakaran", deskripsi: "Kebakaran & penyelamatan", telepon: "113" },
] as const;

export type SumberNomorNasional = { nomor: readonly string[]; nama: string; url: string; diperiksaPada: string };

/** Diperiksa 28 September 2026. Portal 112 menolak klien non-browser, jadi tidak ikut `npm run cek:sumber`. */
export const SUMBER_NOMOR_NASIONAL: readonly SumberNomorNasional[] = [
  {
    // Tabel "Kontak Darurat": Pusdalops BNPB Call Center 117, Polisi 110, Telepon Darurat 112,
    // Pemadam Kebakaran 113, SAR/Basarnas 115, Ambulans 118 atau 119.
    nomor: ["110", "112", "113", "115", "117", "119"],
    nama: `${BUKU_SAKU_BNPB.nama}, "Kontak Darurat", hal. 82`,
    url: sumberBukuSaku("82").sumberUrl,
    diperiksaPada: "2026-09-28",
  },
  {
    // "…mengintegrasikan seluruh nomor darurat seperti 110 (Polisi), 113 (Pemadam Kebakaran), 119 (Ambulans)…"
    nomor: ["110", "113", "119"],
    nama: 'Portal Layanan Panggilan Darurat 112 (Komdigi), "Tentang Call Center 112"',
    url: "https://layanan112.komdigi.go.id/tentang",
    diperiksaPada: "2026-09-28",
  },
  {
    // "…dapat menghubungi Basarnas di nomor 115" (Kepala Basarnas).
    nomor: ["115"],
    nama: 'Basarnas, "Kabasarnas: Darurat SAR, Hubungi 115!"',
    url: "https://basarnas.go.id/berita/kabasarnas-darurat-sar-hubungi-115",
    diperiksaPada: "2026-09-28",
  },
];
