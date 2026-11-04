/**
 * Nomor telepon BPBD yang sudah diverifikasi dari sumber resmi (DECISIONS D-007, D-043).
 *
 * Kunci: kode Kemendagri kab/kota ("36.71") atau provinsi ("31") pemilik BPBD.
 * Syarat setiap entri (diuji di tests/unit/kontak-darurat.test.ts):
 *   - `sumberUrl` situs resmi BPBD/pemda (domain *.go.id) yang masih aktif dan memuat nomor itu
 *     persis seperti `telepon` (diperiksa ulang oleh `npm run cek:sumber`);
 *   - `diperiksaPada` tanggal nomor dicocokkan dengan sumbernya (YYYY-MM-DD).
 * BPBD tanpa entri ditampilkan "Nomor belum tersedia". Jangan menambah nomor dari berita,
 * media sosial, direktori pihak ketiga, atau langsung dari Buku Saku BNPB (2019–2020): tabel BPBD
 * di buku itu hanya petunjuk untuk dicocokkan dengan situs resmi.
 */
export type KontakBpbdTerverifikasi = {
  telepon: string;
  keterangan?: string;
  sumberNama: string;
  sumberUrl: string;
  diperiksaPada: string;
};

export const KONTAK_BPBD: Readonly<Record<string, KontakBpbdTerverifikasi>> = {
  // Footer situs BPBD DIY ("Pusdalops BPBD DIY"). Cocok dengan petunjuk Buku Saku BNPB hal. 85.
  "34": {
    telepon: "(0274) 555585",
    keterangan: "Nomor Pusdalops BPBD DIY. WhatsApp: (0274) 555584.",
    sumberNama: "Situs resmi BPBD DIY (bpbd.jogjaprov.go.id)",
    sumberUrl: "https://bpbd.jogjaprov.go.id/beranda",
    diperiksaPada: "2026-09-27",
  },
};
