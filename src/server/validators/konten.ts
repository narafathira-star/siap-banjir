import { z } from "zod";
import { POLA_KODE_WILAYAH } from "@/lib/kode-wilayah";

export const tingkatRisikoSchema = z.enum(["RENDAH", "SEDANG", "TINGGI"]);

export const parameterRisikoSchema = z.enum([
  "hujan_1jam",
  "hujan_24jam",
  "hujan_3hari",
  "prakiraan_hujan_24jam",
  "peluang_hujan_max",
]);

export const kategoriInformasiSchema = z.enum(["UMUM", "RIWAYAT_KEJADIAN"]);

/** Kode Kemendagri bertitik: 36 · 36.71 · 36.71.01 · 36.71.01.1001. */
export const kodeWilayahSchema = z.string().max(13).regex(POLA_KODE_WILAYAH, "kode wilayah Kemendagri tidak valid");
const idWilayahSchema = kodeWilayahSchema;

export const kontakDaruratSchema = z.object({
  nama: z.string().min(1).max(120),
  // null = nomor belum diverifikasi; UI mengarahkan ke 112 / situs resmi.
  telepon: z.string().min(1).max(30).nullable(),
});

export const wilayahInputSchema = z.object({
  idWilayah: idWilayahSchema,
  namaWilayah: z.string().min(1).max(120),
  // Batas kasar wilayah Indonesia.
  koordinatLatitude: z.number().min(-11.5).max(6.5),
  koordinatLongitude: z.number().min(94).max(141.5),
  koordinatPerkiraan: z.boolean().default(false),
});

export const ambangRisikoBaseSchema = z.object({
  idWilayah: idWilayahSchema.nullish(),
  parameter: parameterRisikoSchema,
  nilaiMinimum: z.number().min(0),
  nilaiMaksimum: z.number().min(0).nullish(),
  levelRisiko: tingkatRisikoSchema,
  keterangan: z.string().max(500).nullish(),
});

export const ambangRisikoInputSchema = ambangRisikoBaseSchema.refine((a) => a.nilaiMaksimum == null || a.nilaiMaksimum > a.nilaiMinimum, {
    message: "nilaiMaksimum harus lebih besar dari nilaiMinimum",
    path: ["nilaiMaksimum"],
  });

export const informasiInputSchema = z.object({
  idWilayah: idWilayahSchema.nullish(),
  judul: z.string().min(1).max(200),
  isi: z.string().min(1),
  kategori: kategoriInformasiSchema,
  tanggal: z.coerce.date().optional(),
  sumberNama: z.string().min(1).max(200).nullish(),
  // Hanya https: tautan ditampilkan ke pengguna dan dibuka di tab baru.
  sumberUrl: z.url({ protocol: /^https$/ }).max(500).nullish(),
  // D-059: sumber kedua khusus tanggal kejadian, atau tanggal = tanggal data ("Data per …").
  sumberTanggalNama: z.string().min(1).max(200).nullish(),
  sumberTanggalUrl: z.url({ protocol: /^https$/ }).max(500).nullish(),
  tanggalDataPer: z.boolean().optional(),
});

export const persiapanDiniInputSchema = z.object({
  idWilayah: idWilayahSchema.nullish(),
  levelRisiko: tingkatRisikoSchema,
  isiPersiapan: z.string().min(1).max(500),
  urutan: z.number().int().min(0),
});

export const rekomendasiDasarSchema = z.object({
  idWilayah: idWilayahSchema.nullish(),
  levelRisiko: tingkatRisikoSchema,
  isiRekomendasi: z.string().min(1).max(500),
  urutan: z.number().int().min(0),
  bagian: z.enum(["SIAGA", "JIKA_BANJIR"]).optional(),
  sumberNama: z.string().min(1).max(200).nullish(),
  sumberUrl: z.url({ protocol: /^https$/ }).max(500).nullish(),
});

// Level risiko = potensi banjir; langkah "jika banjir terjadi" hanya relevan di level TINGGI (D-044).
export const rekomendasiInputSchema = rekomendasiDasarSchema.refine(
  (r) => r.bagian !== "JIKA_BANJIR" || r.levelRisiko === "TINGGI",
  { message: "bagian JIKA_BANJIR hanya untuk level TINGGI", path: ["bagian"] },
);

export type WilayahInput = z.input<typeof wilayahInputSchema>;
export type AmbangRisikoInput = z.input<typeof ambangRisikoInputSchema>;
export type InformasiInput = z.input<typeof informasiInputSchema>;
export type PersiapanDiniInput = z.input<typeof persiapanDiniInputSchema>;
export type RekomendasiInput = z.input<typeof rekomendasiInputSchema>;
