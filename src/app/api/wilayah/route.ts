import { NextResponse, type NextRequest } from "next/server";
import { parseQuery } from "@/server/http";
import { anakWilayah } from "@/server/services/wilayah.service";
import { queryAnakWilayahSchema } from "@/server/validators/wilayah";

/** GET /api/wilayah?induk={kode}: anak langsung suatu wilayah; tanpa induk = daftar provinsi. */
export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl, queryAnakWilayahSchema);
  if (!q.ok) return q.res;
  const data = await anakWilayah(q.data.induk ?? null);
  // Data wilayah jarang berubah; boleh di-cache browser/CDN.
  return NextResponse.json({ data }, { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
