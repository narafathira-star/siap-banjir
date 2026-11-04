import { NextResponse, type NextRequest } from "next/server";
import { cekRateLimit, parseQuery, tidakDitemukan } from "@/server/http";
import { limitBacaCuaca } from "@/server/rate-limits";
import { lihatKondisiWilayah } from "@/server/services/pemantauan.service";
import { ringkasanHarian, seriHujan48Jam, seriPerJamPerHari, seriPrakiraanPerJam } from "@/server/services/seri-cuaca";
import { namaTampilan } from "@/server/services/wilayah.service";
import { queryWilayahSchema } from "@/server/validators/risiko";
import { zonaWilayah } from "@/lib/zona-waktu";

/** GET /api/cuaca?wilayah={id}: cuaca terkini + prakiraan (Lihat Data Cuaca «include» Ambil Data Cuaca). */
export async function GET(req: NextRequest) {
  const dibatasi = cekRateLimit(req, limitBacaCuaca);
  if (dibatasi) return dibatasi;
  const q = parseQuery(req.nextUrl, queryWilayahSchema);
  if (!q.ok) return q.res;

  const kondisi = await lihatKondisiWilayah(q.data.wilayah);
  if (!kondisi) return tidakDitemukan("Wilayah tidak ditemukan");
  if (!kondisi.cuaca) {
    return NextResponse.json({ error: "Data cuaca belum tersedia" }, { status: 503 });
  }

  const { dataCuaca, raw, sumber } = kondisi.cuaca;
  // Jam & tanggal seri dalam zona wilayah (WIB/WITA/WIT, D-060).
  const zona = zonaWilayah(kondisi.wilayah.idWilayah);
  return NextResponse.json({
    data: {
      idWilayah: kondisi.wilayah.idWilayah,
      namaWilayah: namaTampilan(kondisi.leluhur),
      // Data cuaca berlaku untuk sel grid 0,1° (±11 km) tempat desa/kelurahan ini berada.
      grid: { kunci: dataCuaca.kunciGrid, latitude: dataCuaca.gridLatitude, longitude: dataCuaca.gridLongitude },
      koordinatPerkiraan: kondisi.wilayah.koordinatPerkiraan,
      sumber,
      waktuAmbil: dataCuaca.waktuAmbil,
      waktuPengamatan: dataCuaca.waktuPengamatan,
      terkini: {
        suhu: dataCuaca.suhu,
        kelembapan: dataCuaca.kelembapan,
        curahHujan: dataCuaca.curahHujan,
        kecepatanAngin: dataCuaca.kecepatanAngin,
        kondisiCuaca: dataCuaca.kondisiCuaca,
      },
      zonaWaktu: zona.singkatan,
      hujan48Jam: seriHujan48Jam(raw, zona),
      perJam: seriPrakiraanPerJam(raw, zona),
      harian: ringkasanHarian(raw, zona),
      perJamPerHari: seriPerJamPerHari(raw, zona),
      atribusi: "Data cuaca: Open-Meteo.com (CC BY 4.0)",
    },
  });
}
