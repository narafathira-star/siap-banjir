import { NextResponse } from "next/server";
import type { z } from "zod";
import { asalSama } from "@/server/asal";
/** Validasi query string dengan Zod; kembalikan data atau respons 400. */
export function parseQuery<S extends z.ZodType>(
  url: URL,
  schema: S,
): { ok: true; data: z.infer<S> } | { ok: false; res: NextResponse } {
  const hasil = schema.safeParse(Object.fromEntries(url.searchParams));
  if (hasil.success) return { ok: true, data: hasil.data };
  return {
    ok: false,
    res: NextResponse.json(
      {
        error: "Parameter tidak valid",
        detail: hasil.error.issues.map(
          (i) => `${i.path.join(".")}: ${i.message}`,
        ),
      },
      { status: 400 },
    ),
  };
}

export const tidakDitemukan = (pesan = "Tidak ditemukan") =>
  NextResponse.json({ error: pesan }, { status: 404 });

/**
 * Baca & validasi body JSON. Wajib Content-Type application/json: form HTML lintas situs
 * tidak bisa mengirim tipe ini tanpa preflight CORS (pertahanan CSRF dasar).
 */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; res: NextResponse }> {
  if (!asalSama(req)) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Asal permintaan tidak diizinkan" },
        { status: 403 },
      ),
    };
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Content-Type harus application/json" },
        { status: 415 },
      ),
    };
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return {
      ok: false,
      res: NextResponse.json(
        { error: "Body bukan JSON yang valid" },
        { status: 400 },
      ),
    };
  }
  const hasil = schema.safeParse(json);
  if (hasil.success) return { ok: true, data: hasil.data };
  return {
    ok: false,
    res: NextResponse.json(
      {
        error: "Data tidak valid",
        detail: hasil.error.issues.map(
          (i) => `${i.path.join(".")}: ${i.message}`,
        ),
      },
      { status: 400 },
    ),
  };
}

export function ipKlien(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon"
  );
}

/** Terapkan rate limiter; kembalikan respons 429 jika melebihi batas. */
export function cekRateLimit(
  req: Request,
  limiter: (kunci: string) => { ok: boolean; retryAfterDetik: number },
): NextResponse | null {
  const hasil = limiter(ipKlien(req));
  if (hasil.ok) return null;
  return NextResponse.json(
    { error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
    { status: 429, headers: { "Retry-After": String(hasil.retryAfterDetik) } },
  );
}
