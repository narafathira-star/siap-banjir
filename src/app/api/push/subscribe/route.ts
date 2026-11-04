import { NextResponse } from "next/server";
import { cekRateLimit, parseBody, tidakDitemukan } from "@/server/http";
import { limitLangganan } from "@/server/rate-limits";
import { lihatDesa } from "@/server/services/wilayah.service";
import { aktifkan, daftarkanPerangkat } from "@/server/services/subscription.service";
import { subscribeBodySchema } from "@/server/validators/push";

/**
 * POST /api/push/subscribe: daftarkanPerangkat() → aktifkan(idPerangkat, wilayah).
 * Juga dipakai untuk memperbarui pengaturan (wilayah / level minimum) perangkat.
 */
export async function POST(req: Request) {
  const dibatasi = cekRateLimit(req, limitLangganan);
  if (dibatasi) return dibatasi;

  const body = await parseBody(req, subscribeBodySchema);
  if (!body.ok) return body.res;
  const { deviceToken, jenisPerangkat, browser, subscription, idWilayah, levelMinimum } = body.data;

  if (!(await lihatDesa(idWilayah))) return tidakDitemukan("Desa/kelurahan tidak ditemukan");

  const idPerangkat = await daftarkanPerangkat({ deviceToken, jenisPerangkat, browser, idWilayah });
  const langganan = await aktifkan(idPerangkat, { idWilayah, subscription, levelMinimum });

  return NextResponse.json({
    data: {
      idPerangkat,
      status: langganan.status,
      idWilayah: langganan.idWilayah,
      levelMinimum: langganan.levelMinimum,
    },
  });
}
