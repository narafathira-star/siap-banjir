import { z } from "zod";
import { kodeWilayahSchema } from "@/server/validators/konten";

/** GET /api/wilayah?induk= (kosong = daftar provinsi). Desa tidak punya anak. */
export const queryAnakWilayahSchema = z.object({
  induk: kodeWilayahSchema.refine((k) => k.split(".").length < 4, "desa/kelurahan tidak punya anak").optional(),
});

export const queryCariWilayahSchema = z.object({
  q: z.string().trim().min(3, "minimal 3 huruf").max(80),
});

/** Batas kasar Indonesia (sama dengan validasi koordinat wilayah). */
export const queryTerdekatSchema = z.object({
  lat: z.coerce.number().min(-11.5).max(6.5),
  lng: z.coerce.number().min(94).max(141.5),
});
