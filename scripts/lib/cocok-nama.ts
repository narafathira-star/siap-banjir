/**
 * Pencocokan nama wilayah antara dua sumber untuk kode yang sama.
 *  - "sama"      : identik setelah normalisasi huruf/spasi/tanda baca & singkatan umum
 *  - "ejaan"     : beda penulisan kecil (spasi, ejaan lama/baru, typo), kemiripan ≥ 0,8
 *  - "berbeda"   : kemungkinan wilayah lain → koordinat sumber kedua tidak dipercaya
 */
const SINGKATAN: [RegExp, string][] = [
  [/\bkab\b\.?/g, "kabupaten"],
  [/\bkec\b\.?/g, "kecamatan"],
  [/\bkel\b\.?/g, "kelurahan"],
  [/\bds\b\.?/g, "desa"],
  [/\bprov\b\.?/g, "provinsi"],
];

export function normalisasiNama(nama: string) {
  let n = nama.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  for (const [pola, ganti] of SINGKATAN) n = n.replace(pola, ganti);
  return n
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  let sebelum = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const kini = [i];
    for (let j = 1; j <= b.length; j++) {
      kini[j] = Math.min(
        (kini[j - 1] as number) + 1,
        (sebelum[j] as number) + 1,
        (sebelum[j - 1] as number) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    sebelum = kini;
  }
  return sebelum[b.length] as number;
}

export function kemiripan(a: string, b: string) {
  const panjang = Math.max(a.length, b.length);
  return panjang === 0 ? 1 : 1 - levenshtein(a, b) / panjang;
}

export type HasilCocokNama = "sama" | "ejaan" | "berbeda";

export function cocokkanNama(namaA: string, namaB: string): HasilCocokNama {
  const a = normalisasiNama(namaA);
  const b = normalisasiNama(namaB);
  if (a === b) return "sama";
  const tanpaSpasiA = a.replace(/ /g, "");
  const tanpaSpasiB = b.replace(/ /g, "");
  if (tanpaSpasiA === tanpaSpasiB) return "ejaan";
  // Ejaan lama/baru umum: oe→u, dj→j, tj→c, ch→kh.
  const ejaanBaru = (s: string) => s.replace(/oe/g, "u").replace(/dj/g, "j").replace(/tj/g, "c").replace(/ch/g, "kh");
  if (ejaanBaru(tanpaSpasiA) === ejaanBaru(tanpaSpasiB)) return "ejaan";
  return kemiripan(tanpaSpasiA, tanpaSpasiB) >= 0.8 ? "ejaan" : "berbeda";
}
