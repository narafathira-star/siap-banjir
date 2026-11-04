/**
 * Sel grid cuaca 0,1° (±11 km). Koordinat wilayah dibulatkan ke titik grid terdekat;
 * semua wilayah di sel yang sama berbagi satu request & cache Open-Meteo.
 * Resolusi model Open-Meteo untuk Indonesia 9–25 km, jadi tidak ada detail yang hilang.
 */
export const RESOLUSI_GRID = 0.1;

export type TitikGrid = { kunciGrid: string; lat: number; lng: number };

const bulat1 = (n: number) => {
  const v = Math.round(n / RESOLUSI_GRID) / 10;
  return Object.is(v, -0) ? 0 : v;
};

export function titikGrid(lat: number, lng: number): TitikGrid {
  const gLat = bulat1(lat);
  const gLng = bulat1(lng);
  return { kunciGrid: `${gLat.toFixed(1)},${gLng.toFixed(1)}`, lat: gLat, lng: gLng };
}

export function titikDariKunci(kunciGrid: string): TitikGrid {
  const [lat, lng] = kunciGrid.split(",").map(Number);
  if (lat === undefined || lng === undefined || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Kunci grid tidak valid: ${kunciGrid}`);
  }
  return { kunciGrid, lat, lng };
}
