import { NextResponse, type NextRequest } from "next/server";
import { cekRateLimit, parseQuery } from "@/server/http";
import { limitBacaCuaca } from "@/server/rate-limits";
import { cariDesa } from "@/server/services/wilayah.service";
import { queryCariWilayahSchema } from "@/server/validators/wilayah";

/** GET /api/wilayah/cari?q=: cari desa/kelurahan (semua kata harus cocok dengan nama lengkap). */
export async function GET(req: NextRequest) {
  const dibatasi = cekRateLimit(req, limitBacaCuaca);
  if (dibatasi) return dibatasi;
  const q = parseQuery(req.nextUrl, queryCariWilayahSchema);
  if (!q.ok) return q.res;
  return NextResponse.json({ data: await cariDesa(q.data.q) });
}
