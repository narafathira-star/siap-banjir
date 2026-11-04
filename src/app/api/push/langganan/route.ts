import { NextResponse, type NextRequest } from "next/server";
import { parseQuery, tidakDitemukan } from "@/server/http";
import { lihatLanggananByEndpoint } from "@/server/services/subscription.service";
import { endpointQuerySchema } from "@/server/validators/push";

/** GET /api/push/langganan?endpoint=: status langganan perangkat ini (untuk halaman Pengaturan). */
export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl, endpointQuerySchema);
  if (!q.ok) return q.res;

  const langganan = await lihatLanggananByEndpoint(q.data.endpoint);
  if (!langganan) return tidakDitemukan("Langganan tidak ditemukan");
  return NextResponse.json({
    data: { status: langganan.status, idWilayah: langganan.idWilayah, levelMinimum: langganan.levelMinimum },
  });
}
