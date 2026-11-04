export const APP_NAME = "Siap Banjir";
export const APP_TAGLINE = "Pantau risiko banjir dan bersiap lebih dini";

export const DISCLAIMER =
  "Level risiko pada Siap Banjir adalah estimasi berdasarkan data cuaca Open-Meteo dan ambang batas risiko yang telah ditentukan. Informasi ini bukan peringatan resmi. Selalu ikuti arahan BMKG, BPBD, dan pemerintah setempat.";

/**
 * Tombol Perbarui mengambil ulang dari Open-Meteo bila data sel grid sudah 15 menit atau lebih;
 * kunjungan biasa memakai cache 30 menit (D-057). Open-Meteo memperbarui cuaca terkini per 15 menit.
 */
export const UMUR_SEGARKAN_MS = 15 * 60 * 1000;

export const OPEN_METEO_ATTRIBUTION = {
  label: "Data cuaca: Open-Meteo.com",
  url: "https://open-meteo.com/",
  licenseLabel: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
} as const;
