/**
 * Import status Layanan Panggilan Darurat 112 per kab/kota dari portal Komdigi.
 *
 *   npm run data:112
 *
 * Sumber: Portal Layanan Panggilan Darurat 112, Kementerian Komunikasi dan Digital
 *   https://layanan112.komdigi.go.id/  (peta "Penyelenggaraan Layanan Panggilan Darurat 112")
 *   - /get/list_server         kode kab/kota yang tampil di peta
 *   - /get/detail_server/{kode} status + tanggal per kab/kota
 * Portal menolak klien non-browser (HTTP 403), jadi dibuka lewat Chromium Playwright.
 * Permintaan dikirim satu per satu dengan jeda agar tidak membebani server.
 *
 * Status (legenda peta; status 1 dikonfirmasi dari kode portal "Sudah Launching {tgl}"):
 *   1 Sudah Launching · 2 Uji Coba · 3 Verifikasi · 4 Dalam Pengajuan · 5/null Belum Permohonan
 * Hanya status 1 yang dianggap "sudah punya layanan 112". Tanggal hanya disimpan untuk status 1
 * (arti kolom tanggal untuk status lain tidak dijelaskan portal). Kontak PIC tidak disimpan.
 *
 * Keluaran (di-commit):
 *   src/data/layanan-112.json                    status per kab/kota + tanggal pengambilan
 *   prisma/data/laporan-impor-layanan-112.md     hasil pencocokan kode ↔ nama Kemendagri
 */
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { chromium } from "@playwright/test";
import { cocokkanNama, normalisasiNama, type HasilCocokNama } from "./lib/cocok-nama";

const PORTAL = "https://layanan112.komdigi.go.id";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const JEDA_MS = 300;

const LABEL_STATUS = {
  1: "Sudah Launching",
  2: "Uji Coba",
  3: "Verifikasi",
  4: "Dalam Pengajuan",
  5: "Belum Permohonan",
} as const;
type KodeStatus = keyof typeof LABEL_STATUS;

const BULAN: Record<string, string> = {
  JANUARY: "01", FEBRUARY: "02", MARCH: "03", APRIL: "04", MAY: "05", JUNE: "06",
  JULY: "07", AUGUST: "08", SEPTEMBER: "09", OCTOBER: "10", NOVEMBER: "11", DECEMBER: "12",
};

type DetailPortal = { provinsi: string; kota: string; status: string | null; tgl_launching: string | null; code: number };

// Kab/kota yang berganti nama sejak data portal dibuat (kode tetap sama).
const GANTI_NAMA: Record<string, string> = {
  "12.12": "Toba Samosir berganti nama menjadi Toba (PP No. 20 Tahun 2020)",
};

// Kemendagri menulis "Kota/Kabupaten Administrasi ..." untuk wilayah DKI Jakarta; portal tidak.
const tanpaAdministrasi = (nama: string) => nama.replace(/\bAdministrasi\b\s*/i, "");

/** "11 FEBRUARY 2016" → "2016-02-11"; null jika formatnya lain. */
function tanggalIso(teks: string | null) {
  const m = teks?.trim().toUpperCase().match(/^(\d{1,2}) ([A-Z]+) (\d{4})$/);
  const bulan = m && BULAN[m[2] as string];
  return m && bulan ? `${m[3]}-${bulan}-${(m[1] as string).padStart(2, "0")}` : null;
}

async function muatKabKota() {
  const tsv = gunzipSync(await readFile("prisma/data/wilayah.tsv.gz")).toString("utf8");
  const peta = new Map<string, string>();
  for (const baris of tsv.split("\n").slice(1)) {
    const [kode, nama] = baris.split("\t");
    if (kode && nama && kode.length === 5) peta.set(kode, nama);
  }
  return peta;
}

async function ambilDariPortal() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ userAgent: UA, locale: "id-ID" });
    await page.goto(`${PORTAL}/`, { waitUntil: "networkidle", timeout: 60_000 });
    const ambil = (path: string) =>
      page.evaluate(async (p) => {
        const res = await fetch(p);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${p}`);
        return res.json();
      }, path);

    const peta = (await ambil("/get/list_server")) as Record<string, string>;
    const kode = Object.keys(peta).sort();
    console.log(`Peta portal memuat ${kode.length} kab/kota.`);
    const detail: DetailPortal[] = [];
    for (const [i, k] of kode.entries()) {
      const hasil = (await ambil(`/get/detail_server/${k}`)) as DetailPortal[];
      if (hasil[0]) detail.push(hasil[0]);
      else console.warn(`  detail kosong untuk ${k}`);
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${kode.length}`);
      await page.waitForTimeout(JEDA_MS);
    }
    return detail;
  } finally {
    await browser.close();
  }
}

type Entri = {
  idWilayah: string;
  namaPortal: string;
  status: KodeStatus;
  statusLabel: (typeof LABEL_STATUS)[KodeStatus];
  tanggalLaunching: string | null;
};
type Catatan = {
  kodePortal: string;
  namaPortal: string;
  namaKemendagri: string | null;
  hasil: HasilCocokNama | "tidak-ada" | "kode-dikoreksi" | "ganti-nama";
  idWilayah: string | null;
};

async function main() {
  const diambilPada = new Date().toISOString().slice(0, 10);
  const kabKota = await muatKabKota();
  const detail = await ambilDariPortal();

  const daftar: Entri[] = [];
  const catatan: Catatan[] = [];
  for (const d of detail) {
    const kodePortal = String(d.code).padStart(4, "0");
    let idWilayah: string | null = `${kodePortal.slice(0, 2)}.${kodePortal.slice(2)}`;
    const namaKemendagri = kabKota.get(idWilayah) ?? null;
    let hasil: Catatan["hasil"] = namaKemendagri ? cocokkanNama(d.kota, tanpaAdministrasi(namaKemendagri)) : "tidak-ada";

    if (hasil === "berbeda" && GANTI_NAMA[idWilayah]) {
      hasil = "ganti-nama";
    } else if (hasil === "berbeda" || hasil === "tidak-ada") {
      // Kode portal bisa memakai kode sebelum pemekaran provinsi (mis. Papua 2022):
      // pakai kab/kota lain hanya jika namanya sama persis dan satu-satunya se-Indonesia.
      const kandidat = [...kabKota].filter(([, n]) => normalisasiNama(tanpaAdministrasi(n)) === normalisasiNama(d.kota));
      if (kandidat.length === 1) {
        idWilayah = (kandidat[0] as [string, string])[0];
        hasil = "kode-dikoreksi";
      } else {
        idWilayah = null;
      }
    }
    catatan.push({ kodePortal, namaPortal: d.kota, namaKemendagri, hasil, idWilayah });
    if (!idWilayah) continue;

    const angka = Number(d.status ?? 5);
    const status = (angka in LABEL_STATUS ? angka : 5) as KodeStatus;
    daftar.push({
      idWilayah,
      namaPortal: d.kota,
      status,
      statusLabel: LABEL_STATUS[status],
      tanggalLaunching: status === 1 ? tanggalIso(d.tgl_launching) : null,
    });
  }
  daftar.sort((a, b) => a.idWilayah.localeCompare(b.idWilayah));

  const data = {
    sumber: {
      nama: "Portal Layanan Panggilan Darurat 112 — Kementerian Komunikasi dan Digital",
      url: `${PORTAL}/`,
    },
    diambilPada,
    keteranganStatus: LABEL_STATUS,
    daftar,
  };
  await writeFile("src/data/layanan-112.json", `${JSON.stringify(data, null, 2)}\n`);

  const jumlah = (s: KodeStatus) => daftar.filter((e) => e.status === s).length;
  const bermasalah = catatan.filter((c) => c.hasil !== "sama");
  const laporan = [
    "# Laporan import Layanan 112",
    "",
    "Dibuat oleh `npm run data:112`. Jangan diedit manual.",
    "",
    `- Sumber: [${data.sumber.nama}](${data.sumber.url}), diambil ${diambilPada}`,
    `- Kab/kota di peta portal: ${detail.length}; dipakai: ${daftar.length}; dari ${kabKota.size} kab/kota Kemendagri`,
    "",
    "## Ringkasan status",
    "",
    "| Status | Jumlah |",
    "|---|---|",
    ...(Object.keys(LABEL_STATUS).map(Number) as KodeStatus[]).map((s) => `| ${s} · ${LABEL_STATUS[s]} | ${jumlah(s)} |`),
    "",
    "Kab/kota yang tidak ada di peta portal ditampilkan aplikasi sebagai \"belum tercatat di portal\".",
    "",
    `## Pencocokan kode ↔ nama Kemendagri yang tidak sama persis (${bermasalah.length})`,
    "",
    ...(bermasalah.length
      ? [
          "Nama Kemendagri dibandingkan tanpa kata \"Administrasi\". `ejaan` = beda penulisan kecil; `ganti-nama` = lihat keterangan;",
          "`kode-dikoreksi` = kode portal tidak cocok, dipakai satu-satunya kab/kota dengan nama sama persis.",
          "",
          "| Kode portal | Nama portal | Nama Kemendagri (kode sama) | Hasil | Kode dipakai | Keterangan |",
          "|---|---|---|---|---|---|",
          ...bermasalah.map(
            (c) =>
              `| ${c.kodePortal} | ${c.namaPortal} | ${c.namaKemendagri ?? "—"} | ${c.hasil} | ${c.idWilayah ?? "tidak dipakai"} | ${(c.idWilayah && GANTI_NAMA[c.idWilayah]) || ""} |`,
          ),
        ]
      : ["Tidak ada."]),
    "",
  ].join("\n");
  await writeFile("prisma/data/laporan-impor-layanan-112.md", laporan);

  console.log(`Selesai: ${daftar.length} kab/kota (${jumlah(1)} sudah launching). Tidak cocok: ${bermasalah.length}.`);
}

void main();
