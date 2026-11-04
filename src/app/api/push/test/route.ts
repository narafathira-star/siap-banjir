import { NextResponse } from "next/server";
import { cekRateLimit, parseBody, tidakDitemukan } from "@/server/http";
import { pushTersedia } from "@/server/integrations/web-push";
import { limitNotifikasiUji } from "@/server/rate-limits";
import { kirimNotifikasiUji } from "@/server/services/notification.service";
import { endpointBodySchema } from "@/server/validators/push";

/** POST /api/push/test: kirim notifikasi uji ke perangkat ini. */
export async function POST(req: Request) {
  const dibatasi = cekRateLimit(req, limitNotifikasiUji);
  if (dibatasi) return dibatasi;
  if (!pushTersedia()) {
    return NextResponse.json({ error: "Notifikasi push belum dikonfigurasi di server" }, { status: 503 });
  }

  const body = await parseBody(req, endpointBodySchema);
  if (!body.ok) return body.res;

  const hasil = await kirimNotifikasiUji(body.data.endpoint);
  switch (hasil.status) {
    case "terkirim":
      return NextResponse.json({ data: { status: "terkirim" } });
    case "tidak-ditemukan":
      return tidakDitemukan("Langganan tidak ditemukan");
    case "kedaluwarsa":
      return NextResponse.json(
        { error: "Langganan sudah tidak berlaku. Aktifkan ulang notifikasi." },
        { status: 410 },
      );
    case "gagal":
      return NextResponse.json({ error: "Push service menolak notifikasi. Coba lagi nanti." }, { status: 502 });
  }
}
