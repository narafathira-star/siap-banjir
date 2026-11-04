import type { OpenMeteoResponse } from "@/server/integrations/open-meteo";
import { openMeteoResponseSchema } from "@/server/integrations/open-meteo";

/** Buat respons palsu: 5 hari × 24 jam, mulai 2026-09-23 (past_days=2, forecast_days=3). */
export function buatRespons(opsi: {
  currentTime: string;
  currentPrecip?: number;
  hujanPerJam: (waktu: string) => number | null;
  peluangPerJam?: (waktu: string) => number | null;
  hujanHarian: (number | null)[];
}): OpenMeteoResponse {
  const hari = ["2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"];
  const time = hari.flatMap((h) => Array.from({ length: 24 }, (_, j) => `${h}T${String(j).padStart(2, "0")}:00`));
  return openMeteoResponseSchema.parse({
    latitude: -6.22,
    longitude: 106.9,
    utc_offset_seconds: 25200,
    timezone: "Asia/Jakarta",
    current: {
      time: opsi.currentTime,
      interval: 900,
      temperature_2m: 30,
      relative_humidity_2m: 70,
      precipitation: opsi.currentPrecip ?? 0,
      weather_code: 61,
      wind_speed_10m: 10,
    },
    hourly: {
      time,
      precipitation: time.map(opsi.hujanPerJam),
      precipitation_probability: time.map(opsi.peluangPerJam ?? (() => 50)),
      temperature_2m: time.map(() => 28),
    },
    daily: {
      time: hari,
      precipitation_sum: opsi.hujanHarian,
      precipitation_probability_max: hari.map(() => 80),
    },
  });
}
