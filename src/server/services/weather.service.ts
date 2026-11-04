/**
 * Use case "Ambil Data Cuaca": ambil dari Open-Meteo atau cache DB yang masih segar.
 * Cache per sel grid 0,1° (bukan per wilayah): semua desa di sel yang sama berbagi data.
 */
import type { DataCuaca } from "@prisma/client";
import type { TitikGrid } from "@/lib/grid";
import type { SumberData } from "@/lib/tipe-risiko";
import { db } from "@/server/db";
import {
  ambilDataCuaca,
  openMeteoResponseSchema,
  parseWaktuLokal,
  type OpenMeteoResponse,
} from "@/server/integrations/open-meteo";
import { BATAS_KUNJUNGAN, pemakaian24Jam } from "@/server/services/kuota.service";

export const UMUR_CACHE_MS = 30 * 60 * 1000;

export type { SumberData };

export type HasilDataCuaca = {
  dataCuaca: DataCuaca;
  raw: OpenMeteoResponse;
  sumber: SumberData;
};

/** simpanData(): simpan respons Open-Meteo sebagai DataCuaca untuk sel grid. */
export async function simpanData(titik: TitikGrid, raw: OpenMeteoResponse) {
  const { current } = raw;
  return db.dataCuaca.create({
    data: {
      kunciGrid: titik.kunciGrid,
      gridLatitude: titik.lat,
      gridLongitude: titik.lng,
      curahHujan: current.precipitation,
      suhu: current.temperature_2m,
      kelembapan: current.relative_humidity_2m,
      kondisiCuaca: current.weather_code,
      kecepatanAngin: current.wind_speed_10m,
      waktuPengamatan: parseWaktuLokal(current.time, raw.utc_offset_seconds),
      rawJson: raw,
    },
  });
}

/** ambilDataDariAPI(titik): titik pusat sel grid → Open-Meteo → simpanData(). */
export async function ambilDataDariAPI(titik: TitikGrid) {
  const raw = await ambilDataCuaca(titik.lat, titik.lng);
  const dataCuaca = await simpanData(titik, raw);
  return { dataCuaca, raw };
}

export async function dataCuacaTerakhir(kunciGrid: string) {
  return db.dataCuaca.findFirst({ where: { kunciGrid }, orderBy: { waktuAmbil: "desc" } });
}

export function bacaRawJson(dataCuaca: DataCuaca): OpenMeteoResponse | null {
  const hasil = openMeteoResponseSchema.safeParse(dataCuaca.rawJson);
  return hasil.success ? hasil.data : null;
}

export function cacheSegar(dataCuaca: DataCuaca, sekarang = Date.now(), umurMaksMs = UMUR_CACHE_MS) {
  return sekarang - dataCuaca.waktuAmbil.getTime() < umurMaksMs;
}

/**
 * Pastikan data cuaca tersedia untuk sel grid: pakai cache < 30 menit (`umurMaksMs`; tombol Perbarui
 * memakai 15 menit, D-057), jika tidak ambil dari API.
 * - API gagal → data terakhir (sumber "cadangan").
 * - Kuota harian hampir habis → data terakhir tanpa memanggil API (sumber "hemat-kuota").
 * null jika tidak ada data sama sekali.
 */
export async function lihatDataCuaca(
  titik: TitikGrid,
  opsi: { paksa?: boolean; batasKuota?: number; umurMaksMs?: number } = {},
): Promise<HasilDataCuaca | null> {
  const terakhir = await dataCuacaTerakhir(titik.kunciGrid);
  const rawTerakhir = terakhir ? bacaRawJson(terakhir) : null;
  const cadangan = (sumber: SumberData) =>
    terakhir && rawTerakhir ? { dataCuaca: terakhir, raw: rawTerakhir, sumber } : null;

  if (terakhir && rawTerakhir && !opsi.paksa && cacheSegar(terakhir, Date.now(), opsi.umurMaksMs)) {
    return { dataCuaca: terakhir, raw: rawTerakhir, sumber: "cache" };
  }

  if ((await pemakaian24Jam()) >= (opsi.batasKuota ?? BATAS_KUNJUNGAN)) {
    console.warn(`[cuaca] Batas kuota harian tercapai; ${titik.kunciGrid} memakai data tersimpan.`);
    return cadangan("hemat-kuota");
  }

  try {
    const baru = await ambilDataDariAPI(titik);
    return { ...baru, sumber: "api" };
  } catch (err) {
    console.error(`[cuaca] Gagal mengambil data Open-Meteo untuk ${titik.kunciGrid}:`, err);
    return cadangan("cadangan");
  }
}
