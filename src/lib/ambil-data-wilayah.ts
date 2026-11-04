import type { RisikoKlien, SumberData } from "@/lib/tipe-risiko";
import type { RingkasanHarian, SeriHarian, TitikGrafikJam } from "@/server/services/seri-cuaca";

/** Bagian `terkini` dari GET /api/cuaca. */
export type CuacaTerkini = {
  suhu: number;
  kelembapan: number;
  curahHujan: number;
  kecepatanAngin: number;
  kondisiCuaca: number;
};

/** Isi halaman Cuaca (D-056): dari render server atau GET /api/cuaca. */
export type DataHalamanCuaca = {
  terkini: CuacaTerkini;
  /** ISO 8601 */
  waktuAmbil: string;
  sumber: SumberData;
  koordinatPerkiraan: boolean;
  harian: RingkasanHarian[];
  perJamPerHari: SeriHarian[];
};

/** GET JSON `{ data }` dari API sendiri; galat membawa pesan `error` dari server. */
export async function ambilJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const pesan =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `HTTP ${res.status}`;
    throw new Error(pesan);
  }
  return (json as { data: T }).data;
}

/**
 * Ambil ulang risiko & cuaca satu wilayah dari API (server memastikan data Open-Meteo/cache segar).
 * Dipakai tombol "Perbarui" di Risiko (state machine), tombol jam pembaruan di Beranda (D-055), dan
 * pembaruan otomatis Beranda, Cuaca, Risiko (D-056). Bukan `router.refresh()`: di Next.js 15.5 refresh
 * sering tidak di-commit (D-055).
 *
 * `segarkan` (tombol Perbarui, D-057): server mengambil ulang dari Open-Meteo bila data ≥ 15 menit.
 * Risiko diminta dulu agar cuaca sesudahnya membaca data yang sama (satu panggilan Open-Meteo, bukan dua).
 */
export async function ambilDataWilayah(idWilayah: string, opsi: { segarkan?: boolean } = {}) {
  const q = encodeURIComponent(idWilayah);
  const ambilRisiko = () => ambilJson<RisikoKlien>(`/api/risiko?wilayah=${q}${opsi.segarkan ? "&segarkan=1" : ""}`);
  const ambilCuaca = () => ambilJson<DataHalamanCuaca & { hujan48Jam: TitikGrafikJam[] }>(`/api/cuaca?wilayah=${q}`);
  const [risiko, cuaca] = opsi.segarkan
    ? [await ambilRisiko(), await ambilCuaca()]
    : await Promise.all([ambilRisiko(), ambilCuaca()]);
  const { hujan48Jam, terkini, waktuAmbil, sumber, koordinatPerkiraan, harian, perJamPerHari } = cuaca;
  return {
    risiko,
    hujan48Jam,
    terkini,
    cuaca: { terkini, waktuAmbil, sumber, koordinatPerkiraan, harian, perJamPerHari } satisfies DataHalamanCuaca,
  };
}
