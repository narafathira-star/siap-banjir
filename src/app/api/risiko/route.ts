import { NextResponse, type NextRequest } from "next/server";
import { cekRateLimit, parseQuery, tidakDitemukan } from "@/server/http";
import { limitBacaCuaca } from "@/server/rate-limits";
import { keRisikoKlien, lihatKondisiWilayah } from "@/server/services/pemantauan.service";
import { queryRisikoSchema } from "@/server/validators/risiko";

/**
 * GET /api/risiko?wilayah={id}[&segarkan=1]: level risiko terkini (refresh berkala & tombol Perbarui).
 * segarkan=1: ambil ulang dari Open-Meteo bila data sel grid ≥ 15 menit, tetap di bawah batas kuota (D-057).
 */
export async function GET(req: NextRequest) {
  const dibatasi = cekRateLimit(req, limitBacaCuaca);
  if (dibatasi) return dibatasi;
  const q = parseQuery(req.nextUrl, queryRisikoSchema);
  if (!q.ok) return q.res;

  const kondisi = await lihatKondisiWilayah(q.data.wilayah, { segarkan: q.data.segarkan === "1" });
  if (!kondisi) return tidakDitemukan("Wilayah tidak ditemukan");

  const data = keRisikoKlien(kondisi);
  if (!data) return NextResponse.json({ error: "Data cuaca belum tersedia" }, { status: 503 });
  return NextResponse.json({ data });
}
