/**
 * Class "Open-Meteo «External API»" dari class diagram.
 * Dokumentasi: https://open-meteo.com/en/docs — gratis, tanpa API key, lisensi CC BY 4.0.
 */
import { z } from "zod";

const DEFAULT_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 10_000;
const MAX_RETRY = 2;
const BACKOFF_MS = [500, 1500];

// Nilai di array hourly/daily bisa null jika model tidak punya data untuk jam itu.
const angkaAtauNull = z.number().nullable();

export const openMeteoResponseSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  utc_offset_seconds: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    interval: z.number(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number().min(0).max(100),
    precipitation: z.number().min(0),
    weather_code: z.number().int(),
    wind_speed_10m: z.number().min(0),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    precipitation: z.array(angkaAtauNull),
    precipitation_probability: z.array(angkaAtauNull),
    temperature_2m: z.array(angkaAtauNull),
  }),
  daily: z.object({
    time: z.array(z.string()),
    precipitation_sum: z.array(angkaAtauNull),
    precipitation_probability_max: z.array(angkaAtauNull),
  }),
});

export type OpenMeteoResponse = z.infer<typeof openMeteoResponseSchema>;

export class OpenMeteoError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OpenMeteoError";
  }
}

export function buatUrlOpenMeteo(latitude: number, longitude: number, baseUrl = DEFAULT_BASE_URL) {
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    // 10 variabel total (current 5 + hourly 3 + daily 2) = 1,0 API call. `rain` tidak diminta
    // karena sudah tercakup `precipitation` (DECISIONS D-036).
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    hourly: "precipitation,precipitation_probability,temperature_2m",
    daily: "precipitation_sum,precipitation_probability_max",
    past_days: "2",
    // 4 hari (bukan 3) agar hari ke-3 di zona WITA/WIT tetap lengkap 24 jam (D-060); tetap 1,0 call.
    forecast_days: "4",
    timezone: "Asia/Jakarta",
  }).toString();
  return url;
}

const tunggu = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ambilDataCuaca(latitude, longitude): request ke Open-Meteo.
 * Timeout 10 detik per percobaan, retry 2x dengan backoff. Respons divalidasi Zod.
 */
export async function ambilDataCuaca(latitude: number, longitude: number): Promise<OpenMeteoResponse> {
  const url = buatUrlOpenMeteo(latitude, longitude, process.env.OPEN_METEO_BASE_URL || DEFAULT_BASE_URL);
  let galatTerakhir: unknown;

  for (let percobaan = 0; percobaan <= MAX_RETRY; percobaan++) {
    if (percobaan > 0) await tunggu(BACKOFF_MS[percobaan - 1] ?? 1500);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
      if (!res.ok) {
        // 4xx = permintaan salah; tidak ada gunanya diulang.
        if (res.status >= 400 && res.status < 500) {
          throw new OpenMeteoError(`Open-Meteo menolak permintaan (HTTP ${res.status})`);
        }
        galatTerakhir = new OpenMeteoError(`Open-Meteo gagal (HTTP ${res.status})`);
        continue;
      }
      const hasil = openMeteoResponseSchema.safeParse(await res.json());
      if (!hasil.success) {
        throw new OpenMeteoError("Format respons Open-Meteo tidak sesuai", { cause: hasil.error });
      }
      return hasil.data;
    } catch (err) {
      if (err instanceof OpenMeteoError) throw err;
      galatTerakhir = err; // timeout / jaringan → coba lagi
    }
  }

  throw new OpenMeteoError("Tidak dapat menghubungi Open-Meteo", { cause: galatTerakhir });
}

/** Ubah waktu lokal Open-Meteo ("2026-09-25T13:00") menjadi Date memakai utc_offset_seconds. */
export function parseWaktuLokal(waktu: string, utcOffsetSeconds: number): Date {
  const [tanggal = "", jam = "00:00"] = waktu.split("T");
  const [y, m, d] = tanggal.split("-").map(Number);
  const [hh, mm] = jam.split(":").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0) - utcOffsetSeconds * 1000);
}
