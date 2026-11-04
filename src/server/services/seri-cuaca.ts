/**
 * Penyusun data grafik dari respons Open-Meteo. Fungsi murni.
 * Open-Meteo diminta dalam zona Asia/Jakarta ("2026-09-25T13:00") karena cache dipakai bersama per sel grid.
 * Untuk wilayah WITA/WIT, waktu diubah ke zona wilayah (D-060); setelah itu dibandingkan sebagai string.
 */
import { waktuLokal, type ZonaWaktu } from "@/lib/zona-waktu";
import { parseWaktuLokal, type OpenMeteoResponse } from "@/server/integrations/open-meteo";

/** Jumlah hari prakiraan yang ditampilkan (hari ini, besok, lusa). */
export const HARI_PRAKIRAAN = 3;

export type TitikGrafikJam = {
  waktu: string; // "2026-09-25T13:00" (zona wilayah)
  jam: string; // "13:00"
  tanggal: string; // "2026-09-25"
  hujan: number | null;
  peluang: number | null;
  suhu: number | null;
  /** true = data pengamatan (sudah lewat), false = prakiraan. */
  lalu: boolean;
};

export type RingkasanHarian = {
  tanggal: string;
  hujan: number | null;
  peluangMaks: number | null;
  suhuMin: number | null;
  suhuMaks: number | null;
};

const zonaSamaDenganData = (raw: OpenMeteoResponse, zona: ZonaWaktu) => raw.utc_offset_seconds === zona.offsetJam * 3600;

/** Waktu lokal Open-Meteo → waktu lokal zona wilayah. */
function keZona(waktu: string, raw: OpenMeteoResponse, zona: ZonaWaktu) {
  if (zonaSamaDenganData(raw, zona)) return waktu;
  return waktuLokal(parseWaktuLokal(waktu, raw.utc_offset_seconds).getTime(), zona);
}

function jamSekarang(raw: OpenMeteoResponse, zona: ZonaWaktu) {
  return `${keZona(raw.current.time, raw, zona).slice(0, 13)}:00`;
}

function semuaTitik(raw: OpenMeteoResponse, zona: ZonaWaktu): TitikGrafikJam[] {
  const sekarang = jamSekarang(raw, zona);
  const { time, precipitation, precipitation_probability, temperature_2m } = raw.hourly;
  return time.map((asli, i) => {
    const waktu = keZona(asli, raw, zona);
    return {
      waktu,
      jam: waktu.slice(11, 16),
      tanggal: waktu.slice(0, 10),
      hujan: precipitation[i] ?? null,
      peluang: precipitation_probability[i] ?? null,
      suhu: temperature_2m[i] ?? null,
      lalu: waktu <= sekarang,
    };
  });
}

/** Titik per jam dikelompokkan per tanggal lokal, mulai hari ini; hanya hari yang lengkap 24 jam. */
function perHariLengkap(raw: OpenMeteoResponse, zona: ZonaWaktu): SeriHarian[] {
  const hariIni = jamSekarang(raw, zona).slice(0, 10);
  const hasil: SeriHarian[] = [];
  for (const t of semuaTitik(raw, zona)) {
    if (t.tanggal < hariIni) continue;
    const terakhir = hasil.at(-1);
    if (terakhir?.tanggal === t.tanggal) terakhir.titik.push(t);
    else hasil.push({ tanggal: t.tanggal, titik: [t] });
  }
  return hasil.filter((h) => h.titik.length === 24).slice(0, HARI_PRAKIRAAN);
}

const angka = (xs: (number | null)[]) => xs.filter((x): x is number => x != null);

/** 24 jam terakhir (termasuk jam sekarang) + 24 jam ke depan. */
export function seriHujan48Jam(raw: OpenMeteoResponse, zona: ZonaWaktu): TitikGrafikJam[] {
  const titik = semuaTitik(raw, zona);
  const idx = titik.findIndex((t) => t.waktu === jamSekarang(raw, zona));
  if (idx < 0) return titik.slice(-48);
  return titik.slice(Math.max(0, idx - 23), idx + 25);
}

/** Prakiraan per jam dari jam sekarang sampai akhir data. */
export function seriPrakiraanPerJam(raw: OpenMeteoResponse, zona: ZonaWaktu): TitikGrafikJam[] {
  const sekarang = jamSekarang(raw, zona);
  return semuaTitik(raw, zona).filter((t) => t.waktu >= sekarang);
}

/**
 * Ringkasan harian mulai hari ini (per hari kalender zona wilayah).
 * WIB: hujan & peluang maksimum dari `daily` Open-Meteo. WITA/WIT: dijumlahkan/dimaksimumkan dari
 * data per jam hari lokal itu, karena `daily` mengikuti hari WIB (D-060).
 */
export function ringkasanHarian(raw: OpenMeteoResponse, zona: ZonaWaktu): RingkasanHarian[] {
  return perHariLengkap(raw, zona).map(({ tanggal, titik }) => {
    const suhu = angka(titik.map((t) => t.suhu));
    const ringkas = { suhuMin: suhu.length ? Math.min(...suhu) : null, suhuMaks: suhu.length ? Math.max(...suhu) : null };
    if (zonaSamaDenganData(raw, zona)) {
      const i = raw.daily.time.indexOf(tanggal);
      return {
        tanggal,
        hujan: raw.daily.precipitation_sum[i] ?? null,
        peluangMaks: raw.daily.precipitation_probability_max[i] ?? null,
        ...ringkas,
      };
    }
    const hujan = angka(titik.map((t) => t.hujan));
    const peluang = angka(titik.map((t) => t.peluang));
    return {
      tanggal,
      hujan: hujan.length ? Math.round(hujan.reduce((a, b) => a + b, 0) * 10) / 10 : null,
      peluangMaks: peluang.length ? Math.max(...peluang) : null,
      ...ringkas,
    };
  });
}

export type SeriHarian = { tanggal: string; titik: TitikGrafikJam[] };

/** Data per jam per tanggal lokal, mulai hari ini (00:00–23:00; jam yang sudah lewat bertanda `lalu`). */
export function seriPerJamPerHari(raw: OpenMeteoResponse, zona: ZonaWaktu): SeriHarian[] {
  return perHariLengkap(raw, zona);
}
