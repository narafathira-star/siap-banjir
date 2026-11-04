/** Bentuk data risiko yang dikirim ke klien (JSON: tanggal sebagai string ISO). */
import type { TingkatRisiko } from "@prisma/client";
import type { HasilParameter } from "@/server/validators/risiko";

/**
 * api = baru diambil; cache = data DB < 30 menit;
 * cadangan = API gagal, memakai data terakhir yang tersimpan;
 * hemat-kuota = batas harian Open-Meteo hampir tercapai, memakai data terakhir yang tersimpan.
 */
export type SumberData = "api" | "cache" | "cadangan" | "hemat-kuota";

export type RisikoKlien = {
  idRisiko: string;
  idWilayah: string;
  /** "Kelurahan Sukarasa, Kota Tangerang" */
  namaWilayah: string;
  /** "Kec. Tangerang, Kota Tangerang, Banten" */
  namaInduk: string;
  /** true = koordinat pusat kecamatan dipakai (centroid desa tidak tersedia). */
  koordinatPerkiraan: boolean;
  level: TingkatRisiko;
  /** true = hasil `npm run simulasi` (nilai hujan simulasi), bukan kondisi cuaca sebenarnya. */
  simulasi: boolean;
  skorRisiko: number;
  deskripsi: string;
  parameter: HasilParameter[];
  waktu: string;
  sumberData: SumberData;
  waktuAmbilData: string;
};

export type RekomendasiKlien = {
  idRekomendasi: string;
  isiRekomendasi: string;
  bagian: "SIAGA" | "JIKA_BANJIR";
  sumberNama: string | null;
  sumberUrl: string | null;
};

export type PenangananKlien = {
  level: TingkatRisiko;
  persiapan: { idPersiapan: string; isiPersiapan: string }[];
  rekomendasi: RekomendasiKlien[];
};
