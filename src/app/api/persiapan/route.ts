import { NextResponse, type NextRequest } from "next/server";
import { parseQuery } from "@/server/http";
import { lihatPersiapan } from "@/server/services/content.service";
import { lihatPersiapanWilayah } from "@/server/services/pemantauan.service";
import { queryPenangananSchema } from "@/server/validators/risiko";

/** GET /api/persiapan?level=RENDAH|SEDANG|TINGGI&wilayah={id}: lihatPersiapan(level, wilayah), disesuaikan status 112 (D-051). */
export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl, queryPenangananSchema);
  if (!q.ok) return q.res;
  const { level, wilayah } = q.data;
  return NextResponse.json({ data: await (wilayah ? lihatPersiapanWilayah(level, wilayah) : lihatPersiapan(level)) });
}
