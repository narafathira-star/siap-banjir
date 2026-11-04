/**
 * Import wilayah Indonesia (Provinsi → Kab/Kota → Kecamatan → Desa/Kelurahan).
 *
 *   npm run data:wilayah
 *
 * Sumber (dikunci ke commit tertentu agar hasil bisa diulang):
 *   - Kode & nama resmi : cahyadsn/wilayah            db/wilayah.sql (Kepmendagri 300.2.2-2430/2025)
 *   - Koordinat centroid: cahyadsn/wilayah_boundaries db/{prov,kab,kec,kel}/**.sql
 * Keduanya berlisensi MIT © Cahya DSN (lihat prisma/data/LISENSI-DATA-WILAYAH.md).
 *
 * Keluaran (di-commit):
 *   prisma/data/wilayah.tsv.gz               kode, nama, lat, lng, perkiraan
 *   prisma/data/laporan-impor-wilayah.md     hasil pencocokan kode ↔ nama antar-sumber
 *   prisma/data/sumber-wilayah.json          commit sumber & ringkasan
 *
 * Nama selalu dari Kemendagri. Koordinat dari boundaries hanya dipakai jika namanya cocok
 * (sama/beda ejaan), berada di Indonesia, dan tidak terlalu jauh dari induknya; selain itu
 * dipakai koordinat induk dan ditandai "perkiraan".
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { cocokkanNama, type HasilCocokNama } from "./lib/cocok-nama";
import { ParserTupleSql, parseTupleSql } from "./lib/sql-tuples";
import { jarakKm } from "../src/lib/geo";
import { indukKode, kodeValid } from "../src/lib/kode-wilayah";

const SUMBER_KODE = { repo: "cahyadsn/wilayah", sha: "55a496d3662bf173a65d6860f75ed6be625f2430", file: "db/wilayah.sql" };
const SUMBER_KOORDINAT = { repo: "cahyadsn/wilayah_boundaries", sha: "3c5a7960f4d227a38489094d84252bdbb3f978a5" };

// Batas jarak centroid ke centroid induknya; lebih dari ini dicantumkan di laporan untuk dicek.
const MAKS_JARAK_KM = { KECAMATAN: 250, DESA: 80 } as const;
const BATAS_INDONESIA = { latMin: -11.5, latMaks: 6.5, lngMin: 94, lngMaks: 141.5 };

const DIR_CACHE = ".cache/wilayah";
const DIR_DATA = "prisma/data";
const HEADER = { "User-Agent": "siap-banjir-impor-wilayah" };

const rawUrl = (repo: string, sha: string, path: string) => `https://raw.githubusercontent.com/${repo}/${sha}/${path}`;

type Titik = { nama: string; lat: number | null; lng: number | null };
type Level = "PROVINSI" | "KABKOTA" | "KECAMATAN" | "DESA";
const LEVEL: Level[] = ["PROVINSI", "KABKOTA", "KECAMATAN", "DESA"];
const levelDari = (kode: string) => LEVEL[kode.split(".").length - 1] as Level;

async function ambilTeks(url: string) {
  for (let percobaan = 1; ; percobaan++) {
    try {
      const res = await fetch(url, { headers: HEADER });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return await res.text();
    } catch (err) {
      if (percobaan >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * percobaan));
    }
  }
}

/** Unduh file SQL besar sambil di-parse; kolom polygon (indeks ≥ 4) tidak disimpan. */
async function streamTuple(url: string, onTuple: (t: (string | number | null)[]) => void) {
  for (let percobaan = 1; ; percobaan++) {
    const tuple: (string | number | null)[][] = [];
    try {
      const res = await fetch(url, { headers: HEADER });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${url}`);
      const parser = new ParserTupleSql((t) => tuple.push(t), 4);
      const decoder = new TextDecoder("utf-8");
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.tulis(decoder.decode(value, { stream: true }));
      }
      parser.tulis(decoder.decode());
      tuple.forEach(onTuple);
      return;
    } catch (err) {
      if (percobaan >= 3) throw err;
      await new Promise((r) => setTimeout(r, 2000 * percobaan));
    }
  }
}

async function bacaKodeKemendagri(): Promise<Map<string, string>> {
  const cache = `${DIR_CACHE}/wilayah-${SUMBER_KODE.sha.slice(0, 7)}.sql`;
  const teks = existsSync(cache)
    ? await readFile(cache, "utf8")
    : await ambilTeks(rawUrl(SUMBER_KODE.repo, SUMBER_KODE.sha, SUMBER_KODE.file));
  if (!existsSync(cache)) await writeFile(cache, teks);

  const hasil = new Map<string, string>();
  for (const [kode, nama] of parseTupleSql(teks)) {
    if (typeof kode !== "string" || typeof nama !== "string") continue;
    if (!kodeValid(kode)) throw new Error(`Kode Kemendagri tidak valid: ${kode}`);
    hasil.set(kode, nama.trim());
  }
  return hasil;
}

async function bacaKoordinat(): Promise<{ data: Map<string, Titik>; duplikat: string[] }> {
  const cache = `${DIR_CACHE}/boundaries-${SUMBER_KOORDINAT.sha.slice(0, 7)}.tsv`;
  const data = new Map<string, Titik>();
  const duplikat: string[] = [];

  if (existsSync(cache)) {
    for (const baris of (await readFile(cache, "utf8")).split("\n")) {
      if (!baris) continue;
      const [kode = "", nama = "", lat, lng] = baris.split("\t");
      data.set(kode, { nama, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null });
    }
    return { data, duplikat };
  }

  const pohon = (await (
    await fetch(`https://api.github.com/repos/${SUMBER_KOORDINAT.repo}/git/trees/${SUMBER_KOORDINAT.sha}?recursive=1`, {
      headers: HEADER,
    })
  ).json()) as { tree: { path: string; type: string }[]; truncated: boolean };
  if (pohon.truncated) throw new Error("Daftar file GitHub terpotong; tidak bisa memastikan semua file terunduh.");
  const file = pohon.tree
    .filter((f) => f.type === "blob" && /^db\/(prov|kab|kec|kel)\/.+\.sql$/.test(f.path))
    .map((f) => f.path);

  console.log(`Mengunduh ${file.length} file koordinat (±363 MB, polygon dibuang saat dibaca)…`);
  let selesai = 0;
  const antrean = [...file];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let path = antrean.shift(); path; path = antrean.shift()) {
        await streamTuple(rawUrl(SUMBER_KOORDINAT.repo, SUMBER_KOORDINAT.sha, path), ([kode, nama, lat, lng]) => {
          if (typeof kode !== "string") return;
          if (data.has(kode)) duplikat.push(kode);
          data.set(kode, {
            nama: typeof nama === "string" ? nama.trim() : "",
            lat: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
            lng: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
          });
        });
        if (++selesai % 50 === 0 || selesai === file.length) console.log(`  ${selesai}/${file.length} file`);
      }
    }),
  );

  const baris = [...data].map(([k, t]) => `${k}\t${t.nama}\t${t.lat ?? ""}\t${t.lng ?? ""}`);
  await writeFile(cache, baris.join("\n"));
  return { data, duplikat };
}

type Status = HasilCocokNama | "tanpa-data" | "koordinat-kosong" | "di-luar-indonesia" | "jauh-dari-induk";
type Baris = {
  kode: string;
  nama: string;
  level: Level;
  lat: number;
  lng: number;
  perkiraan: boolean;
  status: Status;
  namaSumberKoordinat?: string;
  jarakKeIndukKm?: number;
};

const diIndonesia = (lat: number, lng: number) =>
  lat >= BATAS_INDONESIA.latMin && lat <= BATAS_INDONESIA.latMaks && lng >= BATAS_INDONESIA.lngMin && lng <= BATAS_INDONESIA.lngMaks;

const bulat = (n: number) => Math.round(n * 1e5) / 1e5;

async function main() {
  await mkdir(DIR_CACHE, { recursive: true });
  await mkdir(DIR_DATA, { recursive: true });

  const kemendagri = await bacaKodeKemendagri();
  console.log(`Kemendagri: ${kemendagri.size} kode`);
  const { data: koordinat, duplikat } = await bacaKoordinat();
  console.log(`Koordinat: ${koordinat.size} kode`);

  // Proses per level agar koordinat induk sudah final saat dipakai sebagai fallback/pembanding.
  const kodeUrut = [...kemendagri.keys()].sort((a, b) => a.split(".").length - b.split(".").length || a.localeCompare(b));
  const hasil = new Map<string, Baris>();

  for (const kode of kodeUrut) {
    const nama = kemendagri.get(kode) as string;
    const level = levelDari(kode);
    const induk = indukKode(kode);
    const barisInduk = induk ? hasil.get(induk) : undefined;
    if (induk && !barisInduk) throw new Error(`Induk ${induk} dari ${kode} tidak ada di data Kemendagri`);

    const sumber = koordinat.get(kode);
    let status: Status;
    let titik: { lat: number; lng: number } | null = null;
    let jarakKeIndukKm: number | undefined;

    if (!sumber) status = "tanpa-data";
    else if (sumber.lat === null || sumber.lng === null) status = "koordinat-kosong";
    else {
      status = cocokkanNama(nama, sumber.nama);
      if (status !== "berbeda") {
        if (!diIndonesia(sumber.lat, sumber.lng)) status = "di-luar-indonesia";
        else {
          titik = { lat: sumber.lat, lng: sumber.lng };
          // Hanya dilaporkan, koordinat tetap dipakai: pada import pertama semua kasus ternyata
          // sah (pulau terpencil, kecamatan sangat luas) dan namanya cocok (DECISIONS D-033).
          const batas = level === "KECAMATAN" || level === "DESA" ? MAKS_JARAK_KM[level] : null;
          if (batas && barisInduk) {
            jarakKeIndukKm = jarakKm(titik.lat, titik.lng, barisInduk.lat, barisInduk.lng);
            if (jarakKeIndukKm > batas) status = "jauh-dari-induk";
          }
        }
      }
    }

    // Koordinat tidak bisa dipakai → pakai koordinat induk (ditandai perkiraan).
    const perkiraan = titik === null;
    if (!titik) {
      if (!barisInduk) throw new Error(`Provinsi ${kode} (${nama}) tidak punya koordinat dan tidak punya induk`);
      titik = { lat: barisInduk.lat, lng: barisInduk.lng };
    }

    hasil.set(kode, {
      kode,
      nama,
      level,
      lat: bulat(titik.lat),
      lng: bulat(titik.lng),
      perkiraan,
      status,
      namaSumberKoordinat: sumber?.nama,
      jarakKeIndukKm,
    });
  }

  const tanpaKemendagri = [...koordinat.keys()].filter((k) => !kemendagri.has(k)).sort();
  const semua = [...hasil.values()].sort((a, b) => a.kode.localeCompare(b.kode));

  // --- Data untuk seed ---
  const tsv = ["kode\tnama\tlat\tlng\tperkiraan", ...semua.map((b) => `${b.kode}\t${b.nama}\t${b.lat}\t${b.lng}\t${b.perkiraan ? 1 : 0}`)];
  await writeFile(`${DIR_DATA}/wilayah.tsv.gz`, gzipSync(tsv.join("\n") + "\n", { level: 9 }));

  // --- Ringkasan per level ---
  const STATUS: Status[] = ["sama", "ejaan", "berbeda", "tanpa-data", "koordinat-kosong", "di-luar-indonesia", "jauh-dari-induk"];
  const ringkasan = LEVEL.map((level) => {
    const baris = semua.filter((b) => b.level === level);
    return {
      level,
      jumlah: baris.length,
      perkiraan: baris.filter((b) => b.perkiraan).length,
      ...Object.fromEntries(STATUS.map((s) => [s, baris.filter((b) => b.status === s).length])),
    } as Record<string, number | string>;
  });

  await writeFile(
    `${DIR_DATA}/sumber-wilayah.json`,
    JSON.stringify(
      {
        kodeDanNama: { ...SUMBER_KODE, lisensi: "MIT", dasarHukum: "Kepmendagri No. 300.2.2-2430 Tahun 2025" },
        koordinat: { ...SUMBER_KOORDINAT, lisensi: "MIT", metode: "centroid polygon" },
        dibuat: new Date().toISOString(),
        ringkasan,
      },
      null,
      2,
    ) + "\n",
  );

  // --- Laporan pencocokan ---
  const LABEL: Record<Status, string> = {
    sama: "Nama sama",
    ejaan: "Beda ejaan/penulisan (koordinat dipakai)",
    berbeda: "Nama berbeda (koordinat TIDAK dipakai)",
    "tanpa-data": "Tidak ada di data koordinat",
    "koordinat-kosong": "Koordinat kosong di sumber",
    "di-luar-indonesia": "Koordinat di luar Indonesia",
    "jauh-dari-induk": "Jauh dari induk (koordinat dipakai)",
  };
  const tabelBeda = (daftar: Baris[], kolomJarak = false) =>
    [
      `| Kode | Nama Kemendagri | Nama di data koordinat |${kolomJarak ? " Jarak ke induk |" : ""}`,
      `|---|---|---|${kolomJarak ? "---|" : ""}`,
      ...daftar.map(
        (b) =>
          `| ${b.kode} | ${b.nama} | ${b.namaSumberKoordinat ?? "—"} |${kolomJarak ? ` ${Math.round(b.jarakKeIndukKm ?? 0)} km |` : ""}`,
      ),
    ].join("\n");

  const bagian = (judul: string, daftar: Baris[], keterangan: string, kolomJarak = false) =>
    daftar.length ? `## ${judul} (${daftar.length})\n\n${keterangan}\n\n${tabelBeda(daftar, kolomJarak)}\n` : `## ${judul} (0)\n\nTidak ada.\n`;

  const laporan = [
    "# Laporan import wilayah",
    "",
    "Dibuat oleh `npm run data:wilayah`. Jangan diedit manual.",
    "",
    `- Kode & nama: [${SUMBER_KODE.repo}](https://github.com/${SUMBER_KODE.repo}) @ \`${SUMBER_KODE.sha.slice(0, 7)}\` (Kepmendagri 300.2.2-2430/2025)`,
    `- Koordinat: [${SUMBER_KOORDINAT.repo}](https://github.com/${SUMBER_KOORDINAT.repo}) @ \`${SUMBER_KOORDINAT.sha.slice(0, 7)}\` (centroid polygon)`,
    "",
    "Nama yang dipakai aplikasi **selalu dari Kemendagri**. Koordinat dari data boundaries dipakai jika kodenya ada, namanya cocok (sama atau beda ejaan), dan berada di Indonesia; " +
      "selain itu dipakai koordinat induk dan wilayah ditandai **koordinat perkiraan**. " +
      `Centroid yang jauh dari induknya (desa > ${MAKS_JARAK_KM.DESA} km dari kecamatan, kecamatan > ${MAKS_JARAK_KM.KECAMATAN} km dari kab/kota) dicantumkan untuk diperiksa.`,
    "",
    "## Ringkasan",
    "",
    `| Level | Jumlah | ${STATUS.map((s) => LABEL[s]).join(" | ")} | Koordinat perkiraan |`,
    `|---|---|${STATUS.map(() => "---").join("|")}|---|`,
    ...ringkasan.map((r) => `| ${r.level} | ${r.jumlah} | ${STATUS.map((s) => r[s]).join(" | ")} | ${r.perkiraan} |`),
    "",
    bagian(
      "Nama berbeda",
      semua.filter((b) => b.status === "berbeda"),
      "Kode sama tetapi namanya jauh berbeda, sehingga kemungkinan menunjuk wilayah lain. Koordinatnya tidak dipakai.",
    ),
    bagian(
      "Beda ejaan/penulisan",
      semua.filter((b) => b.status === "ejaan"),
      "Perbedaan spasi, ejaan lama/baru, atau salah ketik kecil (kemiripan ≥ 80%). Koordinat tetap dipakai; nama mengikuti Kemendagri.",
    ),
    bagian(
      "Jauh dari induk",
      semua.filter((b) => b.status === "jauh-dari-induk"),
      "Nama cocok tetapi centroid jauh dari centroid induknya. Koordinat **tetap dipakai**: pada pemeriksaan manual (import 25 September 2026) semua kasus sah, " +
        "yaitu pulau terpencil (mis. Kec. Liukang Tangaya dan Liukang Tupabbiring, Kab. Pangkajene dan Kepulauan; Kec. Tambelan, Kab. Bintan; Pekajang, Kab. Lingga; " +
        "Mapia, Kab. Supiori; Kec. Dawelor Dawera, Maluku Barat Daya) atau kecamatan yang sangat luas (Kab. Kapuas Hulu, Kab. Kapuas). " +
        "Periksa ulang daftar ini setiap kali data sumber diperbarui.",
      true,
    ),
    bagian(
      "Tidak ada koordinat",
      semua.filter((b) => b.status === "tanpa-data" || b.status === "koordinat-kosong" || b.status === "di-luar-indonesia"),
      "Tidak ada di data boundaries, koordinatnya kosong, atau di luar Indonesia. Memakai koordinat induk.",
    ),
    `## Kode di data koordinat yang tidak ada di Kemendagri 2025 (${tanpaKemendagri.length})`,
    "",
    tanpaKemendagri.length ? "Diabaikan.\n\n" + tanpaKemendagri.map((k) => `- ${k} ${koordinat.get(k)?.nama ?? ""}`).join("\n") : "Tidak ada.",
    "",
    `## Kode ganda di data koordinat (${duplikat.length})`,
    "",
    duplikat.length ? duplikat.map((k) => `- ${k}`).join("\n") : "Tidak ada.",
    "",
  ].join("\n");
  await writeFile(`${DIR_DATA}/laporan-impor-wilayah.md`, laporan);

  console.table(ringkasan);
  console.log(`Kode di data koordinat yang tidak ada di Kemendagri: ${tanpaKemendagri.length}; kode ganda: ${duplikat.length}`);
  console.log(`Tertulis: ${DIR_DATA}/wilayah.tsv.gz, laporan-impor-wilayah.md, sumber-wilayah.json`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
