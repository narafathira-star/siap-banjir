import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseQuery } from "@/server/http";
import { lihatInformasi } from "@/server/services/content.service";
import { kategoriInformasiSchema } from "@/server/validators/konten";
import { queryWilayahSchema } from "@/server/validators/risiko";

const querySchema = z.object({
  kategori: kategoriInformasiSchema.optional(),
  wilayah: queryWilayahSchema.shape.wilayah.optional(),
});

/** GET /api/informasi?kategori=UMUM|RIWAYAT_KEJADIAN&wilayah={id} */
export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl, querySchema);
  if (!q.ok) return q.res;
  const data = await lihatInformasi({ kategori: q.data.kategori, idWilayah: q.data.wilayah });
  return NextResponse.json({ data });
}
