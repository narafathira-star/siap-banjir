/**
 * Kode wilayah Kemendagri (Kepmendagri No. 300.2.2-2430/2025), format bertitik:
 *   11 (provinsi) · 11.01 (kab/kota) · 11.01.01 (kecamatan) · 11.01.01.2001 (desa/kelurahan)
 * Kab/kota: 01–69 kabupaten, 71–99 kota. Desa/kelurahan: digit pertama 1 = kelurahan,
 * 2 = desa, 3 = desa adat (lihat cahyadsn/wilayah).
 */
import type { TingkatWilayah } from "@prisma/client";

export const POLA_KODE_WILAYAH = /^\d{2}(\.\d{2}(\.\d{2}(\.\d{4})?)?)?$/;

const LEVEL: Record<number, TingkatWilayah> = { 1: "PROVINSI", 2: "KABKOTA", 3: "KECAMATAN", 4: "DESA" };

export function kodeValid(kode: string) {
  return POLA_KODE_WILAYAH.test(kode);
}

export function levelKode(kode: string): TingkatWilayah {
  const level = LEVEL[kode.split(".").length];
  if (!level || !kodeValid(kode)) throw new Error(`Kode wilayah tidak valid: ${kode}`);
  return level;
}

export function indukKode(kode: string): string | null {
  const i = kode.lastIndexOf(".");
  return i < 0 ? null : kode.slice(0, i);
}

/** Leluhur dari provinsi sampai kode itu sendiri: 36 → 36.71 → 36.71.01 → 36.71.01.1001. */
export function leluhurKode(kode: string): string[] {
  const bagian = kode.split(".");
  return bagian.map((_, i) => bagian.slice(0, i + 1).join("."));
}

/** Kode kab/kota dari kode kecamatan/desa (null untuk provinsi). */
export function kodeKabKota(kode: string): string | null {
  const bagian = kode.split(".");
  return bagian.length >= 2 ? bagian.slice(0, 2).join(".") : null;
}

export type JenisWilayah = "Provinsi" | "Kabupaten" | "Kota" | "Kecamatan" | "Kelurahan" | "Desa";

export function jenisWilayah(kode: string): JenisWilayah {
  const bagian = kode.split(".");
  switch (bagian.length) {
    case 1:
      return "Provinsi";
    case 2:
      return Number(bagian[1]) >= 71 ? "Kota" : "Kabupaten";
    case 3:
      return "Kecamatan";
    default:
      return bagian[3]?.startsWith("1") ? "Kelurahan" : "Desa";
  }
}

export const LABEL_LEVEL_WILAYAH: Record<TingkatWilayah, string> = {
  PROVINSI: "Provinsi",
  KABKOTA: "Kabupaten/Kota",
  KECAMATAN: "Kecamatan",
  DESA: "Desa/Kelurahan",
};
