import { NextResponse } from "next/server";
import { tidakDitemukan } from "@/server/http";
import { lihatWilayahLengkap, namaInduk, namaTampilan } from "@/server/services/wilayah.service";
import { kodeWilayahSchema } from "@/server/validators/konten";

/** GET /api/wilayah/{kode}: detail wilayah beserta leluhurnya. */
export async function GET(_req: Request, { params }: { params: Promise<{ kode: string }> }) {
  const kode = kodeWilayahSchema.safeParse((await params).kode);
  if (!kode.success) return NextResponse.json({ error: "Kode wilayah tidak valid" }, { status: 400 });

  const hasil = await lihatWilayahLengkap(kode.data);
  if (!hasil) return tidakDitemukan("Wilayah tidak ditemukan");
  const { wilayah, leluhur } = hasil;
  return NextResponse.json({
    data: {
      idWilayah: wilayah.idWilayah,
      namaWilayah: wilayah.namaWilayah,
      level: wilayah.level,
      aktif: wilayah.aktif,
      namaTampilan: namaTampilan(leluhur),
      namaInduk: namaInduk(leluhur),
      koordinatLatitude: wilayah.koordinatLatitude,
      koordinatLongitude: wilayah.koordinatLongitude,
      koordinatPerkiraan: wilayah.koordinatPerkiraan,
      leluhur: leluhur.map(({ idWilayah, namaWilayah, level }) => ({ idWilayah, namaWilayah, level })),
    },
  });
}
