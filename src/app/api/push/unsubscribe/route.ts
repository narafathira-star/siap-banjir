import { NextResponse } from "next/server";
import { cekRateLimit, parseBody, tidakDitemukan } from "@/server/http";
import { limitLangganan } from "@/server/rate-limits";
import { nonaktifkan } from "@/server/services/subscription.service";
import { endpointBodySchema } from "@/server/validators/push";

/** POST /api/push/unsubscribe: nonaktifkan notifikasi perangkat (status = false). */
export async function POST(req: Request) {
  const dibatasi = cekRateLimit(req, limitLangganan);
  if (dibatasi) return dibatasi;

  const body = await parseBody(req, endpointBodySchema);
  if (!body.ok) return body.res;

  if (!(await nonaktifkan(body.data.endpoint))) return tidakDitemukan("Langganan tidak ditemukan");
  return NextResponse.json({ data: { status: false } });
}
