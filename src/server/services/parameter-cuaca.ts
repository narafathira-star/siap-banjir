/**
 * Turunan parameter risiko dari respons Open-Meteo (langkah 1 rule engine).
 * Fungsi murni, tanpa akses DB, agar mudah diuji.
 */
import type { ParameterRisiko } from "@prisma/client";
import { parseWaktuLokal, type OpenMeteoResponse } from "@/server/integrations/open-meteo";

export type NilaiParameter = Partial<Record<ParameterRisiko, number>>;

const JAM_MS = 60 * 60 * 1000;

type TitikJam = { waktu: number; hujan: number | null; peluang: number | null };

function titikPerJam(raw: OpenMeteoResponse): TitikJam[] {
  const { time, precipitation, precipitation_probability } = raw.hourly;
  return time.map((t, i) => ({
    waktu: parseWaktuLokal(t, raw.utc_offset_seconds).getTime(),
    hujan: precipitation[i] ?? null,
    peluang: precipitation_probability[i] ?? null,
  }));
}

/** Jumlahkan nilai non-null; undefined jika tidak ada satu pun data. */
function jumlah(nilai: (number | null)[]): number | undefined {
  const ada = nilai.filter((v): v is number => v != null);
  return ada.length ? ada.reduce((a, b) => a + b, 0) : undefined;
}

function maksimum(nilai: (number | null)[]): number | undefined {
  const ada = nilai.filter((v): v is number => v != null);
  return ada.length ? Math.max(...ada) : undefined;
}

const bulatkan = (v: number | undefined) => (v === undefined ? undefined : Math.round(v * 100) / 100);

/**
 * Nilai hourly Open-Meteo pada jam T = jumlah hujan selama (T-1 jam, T].
 * "Sekarang" dibulatkan ke bawah ke jam penuh terakhir.
 */
export function hitungParameterCuaca(raw: OpenMeteoResponse): NilaiParameter {
  const sekarangMs = parseWaktuLokal(raw.current.time, raw.utc_offset_seconds).getTime();
  const jamIni = Math.floor(sekarangMs / JAM_MS) * JAM_MS;
  const jam = titikPerJam(raw);

  const lalu24 = jam.filter((j) => j.waktu > jamIni - 24 * JAM_MS && j.waktu <= jamIni);
  const depan24 = jam.filter((j) => j.waktu > jamIni && j.waktu <= jamIni + 24 * JAM_MS);
  const jamTerakhir = jam.find((j) => j.waktu === jamIni)?.hujan ?? null;

  // current.precipitation hanya mencakup interval current (biasanya 15 menit),
  // jadi dibandingkan dengan jumlah jam terakhir dari hourly (lihat DECISIONS D-012).
  const hujan1Jam = maksimum([raw.current.precipitation, jamTerakhir]);

  // Akumulasi 3 hari = 2 hari lalu + hari ini (daily, tanggal ≤ hari ini).
  const hariIni = raw.current.time.slice(0, 10);
  const indeksHarian = raw.daily.time
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t <= hariIni)
    .slice(-3);
  const hujan3Hari = jumlah(indeksHarian.map(({ i }) => raw.daily.precipitation_sum[i] ?? null));

  const hasil: NilaiParameter = {
    hujan_1jam: bulatkan(hujan1Jam),
    hujan_24jam: bulatkan(jumlah(lalu24.map((j) => j.hujan))),
    hujan_3hari: bulatkan(hujan3Hari),
    prakiraan_hujan_24jam: bulatkan(jumlah(depan24.map((j) => j.hujan))),
    peluang_hujan_max: maksimum(depan24.map((j) => j.peluang)),
  };

  // Buang parameter tanpa data agar tidak dianggap bernilai 0.
  return Object.fromEntries(Object.entries(hasil).filter(([, v]) => v !== undefined)) as NilaiParameter;
}
