/**
 * Cron: perbarui cuaca untuk desa/kelurahan yang punya pelanggan notifikasi aktif →
 * hitung risiko → kirim notifikasi → simpan riwayat. Wilayah tanpa pelanggan tidak diproses
 * (cuacanya diambil saat halaman dibuka). Dilindungi header `Authorization: Bearer ${CRON_SECRET}`.
 *
 * Hemat kuota Open-Meteo (DECISIONS D-035):
 *  - satu request per sel grid 0,1°, dipakai semua desa berlangganan di sel itu;
 *  - sel yang cache-nya masih segar (< 30 menit) tidak meminta ulang;
 *  - maksimal MAKS_SEL_PER_PUTARAN sel diperbarui per putaran, data tertua lebih dulu;
 *    sisanya ditunda ke putaran berikutnya;
 *  - berhenti meminta data baru jika pemakaian 24 jam ≥ BATAS_CRON.
 */
import { NextResponse } from "next/server";
import { otorisasiCron, petakanTerbatas } from "@/server/cron";
import { db } from "@/server/db";
import {
  BATAS_CRON,
  MAKS_SEL_PER_PUTARAN,
  bersihkanDataCuacaLama,
  pemakaian24Jam,
} from "@/server/services/kuota.service";
import { ambilCuacaSel, risikoDesa, tindakLanjutRisiko } from "@/server/services/pemantauan.service";
import { UMUR_CACHE_MS } from "@/server/services/weather.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PARALEL = 4;

type HasilSel = {
  kunciGrid: string;
  desa: number;
  sumber: "api" | "cache" | "cadangan" | "hemat-kuota" | "ditunda" | null;
  risikoBaru: number;
  levelTertinggi: "RENDAH" | "SEDANG" | "TINGGI" | null;
  notifikasiTerkirim: number;
  riwayat: number;
  galat?: string;
};

const URUTAN = { RENDAH: 0, SEDANG: 1, TINGGI: 2 } as const;

async function jalankan(req: Request) {
  if (!otorisasiCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 401 });
  }

  const mulai = Date.now();
  const paksa = new URL(req.url).searchParams.get("paksa") === "1";

  // Desa berlangganan dikelompokkan per sel grid.
  const langganan = await db.langgananNotifikasi.findMany({
    where: { status: true },
    distinct: ["idWilayah"],
    select: { idWilayah: true, wilayah: { select: { kunciGrid: true, aktif: true } } },
  });
  const perSel = new Map<string, string[]>();
  for (const l of langganan) {
    if (!l.wilayah.kunciGrid || !l.wilayah.aktif) continue;
    perSel.set(l.wilayah.kunciGrid, [...(perSel.get(l.wilayah.kunciGrid) ?? []), l.idWilayah]);
  }

  // Data terakhir per sel: yang tertua (atau belum pernah) diperbarui lebih dulu.
  const terakhir = new Map(
    (
      await db.dataCuaca.groupBy({
        by: ["kunciGrid"],
        where: { kunciGrid: { in: [...perSel.keys()] } },
        _max: { waktuAmbil: true },
      })
    ).map((g) => [g.kunciGrid, g._max.waktuAmbil?.getTime() ?? 0]),
  );
  const umur = (k: string) => Date.now() - (terakhir.get(k) ?? 0);
  const perluDiperbarui = [...perSel.keys()]
    .filter((k) => paksa || umur(k) >= UMUR_CACHE_MS)
    .sort((a, b) => umur(b) - umur(a));
  const diperbaruiPutaranIni = new Set(perluDiperbarui.slice(0, MAKS_SEL_PER_PUTARAN));
  const ditunda = new Set(perluDiperbarui.slice(MAKS_SEL_PER_PUTARAN));

  const hasil = await petakanTerbatas([...perSel], PARALEL, async ([kunciGrid, desa]): Promise<HasilSel> => {
    const dasar: HasilSel = { kunciGrid, desa: desa.length, sumber: null, risikoBaru: 0, levelTertinggi: null, notifikasiTerkirim: 0, riwayat: 0 };
    if (ditunda.has(kunciGrid)) return { ...dasar, sumber: "ditunda" };
    try {
      const cuaca = await ambilCuacaSel(kunciGrid, {
        paksa: paksa && diperbaruiPutaranIni.has(kunciGrid),
        batasKuota: BATAS_CRON,
      });
      if (!cuaca) return dasar;
      const h: HasilSel = { ...dasar, sumber: cuaca.sumber };
      // Risiko dihitung untuk setiap desa berlangganan (murah, tanpa request tambahan).
      for (const idWilayah of desa) {
        const { risiko, risikoBaru } = await risikoDesa(idWilayah, cuaca);
        if (!h.levelTertinggi || URUTAN[risiko.level] > URUTAN[h.levelTertinggi]) h.levelTertinggi = risiko.level;
        if (!risikoBaru) continue;
        h.risikoBaru++;
        if (risikoBaru.level === "RENDAH") continue;
        const t = await tindakLanjutRisiko(risikoBaru);
        h.notifikasiTerkirim += t.notifikasi.terkirim;
        if (t.riwayat) h.riwayat++;
      }
      return h;
    } catch (err) {
      console.error(`[cron] sel ${kunciGrid} gagal:`, err);
      return { ...dasar, galat: err instanceof Error ? err.message : String(err) };
    }
  });

  const dataLamaDihapus = await bersihkanDataCuacaLama();
  const ringkasan = {
    desaBerlangganan: langganan.length,
    sel: perSel.size,
    diperbarui: hasil.filter((h) => h.sumber === "api").length,
    dariCache: hasil.filter((h) => h.sumber === "cache").length,
    ditunda: ditunda.size,
    gagal: hasil.filter((h) => h.galat || h.sumber === "cadangan" || h.sumber === "hemat-kuota" || h.sumber === null).length,
    notifikasiTerkirim: hasil.reduce((n, h) => n + h.notifikasiTerkirim, 0),
    riwayat: hasil.reduce((n, h) => n + h.riwayat, 0),
    pemakaianKuota24Jam: await pemakaian24Jam(),
    dataLamaDihapus,
    durasiMs: Date.now() - mulai,
  };
  console.info("[cron] update-weather:", ringkasan);

  return NextResponse.json({ ringkasan, hasil });
}

// Vercel Cron memanggil dengan GET; POST disediakan untuk pemanggil lain.
export const GET = jalankan;
export const POST = jalankan;
