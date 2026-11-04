/**
 * Enkripsi data sensitif di database (aspek Confidentiality).
 *
 * Algoritma : AES-256-GCM (enkripsi + autentikasi, jadi data yang diubah orang lain terdeteksi).
 * Kunci     : DATA_ENCRYPTION_KEY di .env, 64 karakter heksadesimal (32 byte). Hanya ada di server.
 * Format    : kolom JSON berisi { enc, v, iv, tag, data }; IV acak baru untuk setiap enkripsi.
 *
 * Perilaku saat kunci belum diatur:
 *  - NODE_ENV=production -> ERROR (gagal aman, data sensitif tidak pernah tersimpan polos).
 *  - lainnya (dev/test)  -> data disimpan apa adanya agar pengembangan dan test tetap jalan.
 *
 * Data lama yang masih polos tetap bisa dibaca (kompatibel mundur) dan otomatis terenkripsi
 * saat disimpan ulang.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

const ALGORITMA = "aes-256-gcm";
const PANJANG_IV = 12; // ukuran IV yang direkomendasikan untuk GCM

export type AmplopTerenkripsi = {
  enc: typeof ALGORITMA;
  v: 1;
  iv: string;
  tag: string;
  data: string;
};

export class KunciEnkripsiError extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "KunciEnkripsiError";
  }
}

function ambilKunci(): Buffer | null {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex) {
    if (process.env.NODE_ENV === "production") {
      throw new KunciEnkripsiError("DATA_ENCRYPTION_KEY belum diatur di server (wajib pada mode produksi)");
    }
    return null;
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new KunciEnkripsiError("DATA_ENCRYPTION_KEY harus 64 karakter heksadesimal (32 byte)");
  }
  return Buffer.from(hex, "hex");
}

export function adalahAmplop(nilai: unknown): nilai is AmplopTerenkripsi {
  if (typeof nilai !== "object" || nilai === null) return false;
  const o = nilai as Record<string, unknown>;
  return (
    o.enc === ALGORITMA &&
    o.v === 1 &&
    typeof o.iv === "string" &&
    typeof o.tag === "string" &&
    typeof o.data === "string"
  );
}

/** Enkripsi nilai JSON untuk disimpan di kolom Json. */
export function enkripsiJson(nilai: unknown): Prisma.InputJsonValue {
  const kunci = ambilKunci();
  if (!kunci) return nilai as Prisma.InputJsonValue;

  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv(ALGORITMA, kunci, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(nilai), "utf8"), cipher.final()]);
  const amplop: AmplopTerenkripsi = {
    enc: ALGORITMA,
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
  return amplop;
}

/**
 * Buka nilai dari kolom Json. Data polos (format lama) dikembalikan apa adanya.
 * Melempar galat jika kunci salah atau data diubah; sengaja TIDAK mengembalikan null,
 * supaya kesalahan kunci tidak diam-diam dianggap "langganan tidak valid" lalu dihapus.
 */
export function dekripsiJson(nilai: unknown): unknown {
  if (!adalahAmplop(nilai)) return nilai;
  const kunci = ambilKunci();
  if (!kunci) throw new KunciEnkripsiError("Data terenkripsi ditemukan tetapi DATA_ENCRYPTION_KEY belum diatur");

  try {
    const decipher = createDecipheriv(ALGORITMA, kunci, Buffer.from(nilai.iv, "base64"));
    decipher.setAuthTag(Buffer.from(nilai.tag, "base64"));
    const teks = Buffer.concat([decipher.update(Buffer.from(nilai.data, "base64")), decipher.final()]).toString("utf8");
    return JSON.parse(teks) as unknown;
  } catch {
    throw new KunciEnkripsiError("Gagal mendekripsi data: kunci salah atau data telah diubah");
  }
}
