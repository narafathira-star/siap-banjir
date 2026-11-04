/** Terjemahan kode cuaca WMO (weather_code Open-Meteo) ke Bahasa Indonesia + ikon. */
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";

export type KondisiCuacaInfo = { label: string; ikon: LucideIcon };

const PETA: Record<number, KondisiCuacaInfo> = {
  0: { label: "Cerah", ikon: Sun },
  1: { label: "Cerah Berawan", ikon: CloudSun },
  2: { label: "Berawan Sebagian", ikon: CloudSun },
  3: { label: "Berawan", ikon: Cloud },
  45: { label: "Berkabut", ikon: CloudFog },
  48: { label: "Kabut Beku", ikon: CloudFog },
  51: { label: "Gerimis Ringan", ikon: CloudDrizzle },
  53: { label: "Gerimis", ikon: CloudDrizzle },
  55: { label: "Gerimis Lebat", ikon: CloudDrizzle },
  56: { label: "Gerimis Beku", ikon: CloudDrizzle },
  57: { label: "Gerimis Beku Lebat", ikon: CloudDrizzle },
  61: { label: "Hujan Ringan", ikon: CloudRain },
  63: { label: "Hujan Sedang", ikon: CloudRain },
  65: { label: "Hujan Lebat", ikon: CloudRainWind },
  66: { label: "Hujan Beku Ringan", ikon: CloudHail },
  67: { label: "Hujan Beku Lebat", ikon: CloudHail },
  71: { label: "Salju Ringan", ikon: CloudSnow },
  73: { label: "Salju", ikon: CloudSnow },
  75: { label: "Salju Lebat", ikon: CloudSnow },
  77: { label: "Butiran Salju", ikon: CloudSnow },
  80: { label: "Hujan Lokal Ringan", ikon: CloudRain },
  81: { label: "Hujan Lokal", ikon: CloudRain },
  82: { label: "Hujan Lokal Lebat", ikon: CloudRainWind },
  85: { label: "Hujan Salju Ringan", ikon: CloudSnow },
  86: { label: "Hujan Salju Lebat", ikon: CloudSnow },
  95: { label: "Badai Petir", ikon: CloudLightning },
  96: { label: "Badai Petir dan Hujan Es", ikon: CloudLightning },
  99: { label: "Badai Petir dan Hujan Es Lebat", ikon: CloudLightning },
};

export function infoKondisiCuaca(kode: number): KondisiCuacaInfo {
  return PETA[kode] ?? { label: "Tidak diketahui", ikon: Cloud };
}

/** Kategori curah hujan harian BMKG (untuk label, bukan penentu risiko). */
export function kategoriHujanHarian(mm: number) {
  if (mm < 0.5) return "Tidak hujan";
  if (mm < 20) return "Hujan ringan";
  if (mm < 50) return "Hujan sedang";
  if (mm < 100) return "Hujan lebat";
  if (mm <= 150) return "Hujan sangat lebat";
  return "Hujan ekstrem";
}
