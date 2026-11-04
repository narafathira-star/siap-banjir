import { NextResponse, type NextRequest } from "next/server";
import { parseQuery } from "@/server/http";
import { lihatRekomendasi } from "@/server/services/content.service";
import { queryPenangananSchema } from "@/server/validators/risiko";

/** GET /api/rekomendasi?level=RENDAH|SEDANG|TINGGI&wilayah={id}: lihatRekomendasi(level, wilayah). */
export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl, queryPenangananSchema);
  if (!q.ok) return q.res;
  return NextResponse.json({ data: await lihatRekomendasi(q.data.level, q.data.wilayah) });
}
