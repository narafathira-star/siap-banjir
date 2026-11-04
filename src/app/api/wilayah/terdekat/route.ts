import { NextResponse, type NextRequest } from "next/server";
import { cekRateLimit, parseQuery, tidakDitemukan } from "@/server/http";
import { limitBacaCuaca } from "@/server/rate-limits";
import { desaTerdekat, lihatWilayahLengkap, namaTampilan } from "@/server/services/wilayah.service";
import { queryTerdekatSchema } from "@/server/validators/wilayah";

/**
 * GET /api/wilayah/terdekat?lat=&lng=: desa/kelurahan terdekat (jarak ke centroid).
 * Koordinat pengguna hanya dipakai untuk menghitung; tidak disimpan atau dicatat.
 */
export async function GET(req: NextRequest) {
  const dibatasi = cekRateLimit(req, limitBacaCuaca);
  if (dibatasi) return dibatasi;
  const q = parseQuery(req.nextUrl, queryTerdekatSchema);
  if (!q.ok) return q.res;

  const terdekat = await desaTerdekat(q.data.lat, q.data.lng);
  const lengkap = terdekat ? await lihatWilayahLengkap(terdekat.idWilayah) : null;
  if (!terdekat || !lengkap) return tidakDitemukan("Tidak ada desa/kelurahan di sekitar lokasi ini");

  return NextResponse.json({
    data: {
      idWilayah: terdekat.idWilayah,
      namaWilayah: namaTampilan(lengkap.leluhur),
      jarakKm: Math.round(terdekat.jarakKm * 10) / 10,
      koordinatPerkiraan: lengkap.wilayah.koordinatPerkiraan,
    },
  });
}
