/**
 * Pembaca prisma/data/wilayah.tsv.gz (hasil `npm run data:wilayah`).
 * Kolom: kode, nama, lat, lng, perkiraan (1 = koordinat induk dipakai).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { WilayahInput } from "../src/server/validators/konten";

export const FILE_DATA_WILAYAH = join(__dirname, "data", "wilayah.tsv.gz");

export function bacaDataWilayah(file = FILE_DATA_WILAYAH): WilayahInput[] {
  const baris = gunzipSync(readFileSync(file)).toString("utf8").split("\n");
  const [header, ...isi] = baris;
  if (header !== "kode\tnama\tlat\tlng\tperkiraan") throw new Error(`Header ${file} tidak dikenal: ${header}`);
  return isi
    .filter(Boolean)
    .map((b) => {
      const [kode = "", nama = "", lat = "", lng = "", perkiraan = "0"] = b.split("\t");
      return {
        idWilayah: kode,
        namaWilayah: nama,
        koordinatLatitude: Number(lat),
        koordinatLongitude: Number(lng),
        koordinatPerkiraan: perkiraan === "1",
      };
    });
}
