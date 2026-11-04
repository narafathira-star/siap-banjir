/**
 * Buku Saku BNPB (ISBN 978-602-5693-05-2), sumber Detail Mitigasi (D-044) dan daftar nomor
 * darurat nasional (D-051). Halaman PDF = halaman cetak + 2.
 */
export const BUKU_SAKU_BNPB = {
  nama: "BNPB, Buku Saku Tanggap Tangkas Tangguh Menghadapi Bencana",
  url: "https://www.bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf",
} as const;

export function sumberBukuSaku(halaman: string) {
  const pertama = Number.parseInt(halaman, 10);
  return { sumberNama: `${BUKU_SAKU_BNPB.nama}, hal. ${halaman}`, sumberUrl: `${BUKU_SAKU_BNPB.url}#page=${pertama + 2}` };
}
