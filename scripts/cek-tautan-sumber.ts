/**
 * Periksa bahwa semua tautan sumber (informasi, riwayat otomatis, mitigasi) bisa dibuka, dan
 * bahwa setiap nomor BPBD terverifikasi dan nomor nasional (halaman HTML) masih tercantum di halaman sumbernya.
 *
 *   npm run cek:sumber
 *
 * Memakai user agent browser (sebagian situs pemerintah menolak klien non-browser) dan
 * mencoba ulang sekali untuk gangguan jaringan sesaat. Keluar dengan kode 1 jika ada yang gagal.
 * Tidak menyentuh database.
 */
import { informasiSeed, rekomendasiSeed } from "../prisma/seed-data";
import { KONTAK_BPBD } from "../src/data/kontak-bpbd";
import { SUMBER_NOMOR_NASIONAL } from "../src/data/nomor-nasional";
import { SUMBER_DETEKSI } from "../src/lib/sumber-informasi";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0";
const BATAS_WAKTU_MS = 30_000;

/** Samakan spasi agar "(0274)  555585" di HTML tetap cocok dengan "(0274) 555585". */
const rapat = (t: string) => t.replace(/&nbsp;|\s+/g, " ");

/** Buka `url`; jika `harusMemuat` diisi, halaman juga wajib memuat teks itu (mis. nomor BPBD). */
async function cek(url: string, harusMemuat?: string): Promise<{ ok: boolean; keterangan: string }> {
  let keterangan = "";
  for (let percobaan = 1; percobaan <= 2; percobaan++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
        signal: AbortSignal.timeout(BATAS_WAKTU_MS),
      });
      if (res.ok && harusMemuat) {
        const ada = rapat(await res.text()).includes(rapat(harusMemuat));
        return ada ? { ok: true, keterangan: `${res.status}` } : { ok: false, keterangan: "nomor tidak ditemukan" };
      }
      await res.body?.cancel();
      if (res.ok) return { ok: true, keterangan: `${res.status}` };
      keterangan = `HTTP ${res.status}`;
    } catch (err) {
      keterangan = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: false, keterangan };
}

async function main() {
  const daftar: { judul: string; url: string; harusMemuat?: string }[] = [
    ...informasiSeed.filter((i) => i.sumberUrl).map((i) => ({ judul: i.judul, url: i.sumberUrl as string })),
    // Sumber tanggal kejadian riwayat (D-059).
    ...informasiSeed
      .filter((i) => i.sumberTanggalUrl)
      .map((i) => ({ judul: `${i.judul} (tanggal kejadian)`, url: i.sumberTanggalUrl as string })),
    { judul: "Riwayat otomatis", url: SUMBER_DETEKSI.url },
    // Rekomendasi merujuk dokumen yang sama dengan #page berbeda; cukup dicek sekali per dokumen.
    ...[...new Set(rekomendasiSeed.flatMap((r) => (r.sumberUrl ? [r.sumberUrl.split("#")[0] as string] : [])))].map((url) => ({
      judul: "Detail Mitigasi",
      url,
    })),
    // Nomor BPBD harus masih tercantum di situs resmi (D-043).
    ...Object.entries(KONTAK_BPBD).map(([kode, k]) => ({ judul: `BPBD ${kode}: ${k.telepon}`, url: k.sumberUrl, harusMemuat: k.telepon })),
    // Nomor nasional (D-051): halaman HTML wajib masih memuat nomornya; PDF (Buku Saku) cukup bisa dibuka.
    // Portal 112 Komdigi menolak klien non-browser (HTTP 403, D-042), jadi tidak dicek di sini.
    ...SUMBER_NOMOR_NASIONAL.filter((s) => !s.url.startsWith("https://layanan112.komdigi.go.id/")).flatMap((s) => {
      const url = s.url.split("#")[0] as string;
      return url.endsWith(".pdf")
        ? [{ judul: `Nomor nasional ${s.nomor.join(", ")}`, url }]
        : s.nomor.map((nomor) => ({ judul: `Nomor nasional ${nomor}`, url, harusMemuat: nomor }));
    }),
  ];
  const hasil = await Promise.all(daftar.map(async (d) => ({ ...d, ...(await cek(d.url, d.harusMemuat)) })));
  for (const h of hasil) console.log(`${h.ok ? "✔" : "✘"} ${h.keterangan.padEnd(8)} ${h.judul}\n    ${h.url}`);
  const gagal = hasil.filter((h) => !h.ok).length;
  console.log(gagal ? `\n${gagal} tautan gagal dibuka.` : `\nSemua ${hasil.length} tautan bisa dibuka.`);
  if (gagal) process.exitCode = 1;
}

void main();
