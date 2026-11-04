/**
 * Orkestrasi alur sequence diagram:
 *  4. koordinat wilayah → sel grid → ambil/cache data cuaca (Open-Meteo) → simpanData()
 *  5. hitungLevelRisiko() → cekAmbang() (per desa; ambang diwariskan dari leluhur)
 *  6. lihatPersiapan() & lihatRekomendasi()
 *  8. alt [Sedang/Tinggi] → buatNotifikasi() → cariLanggananAktif() → kirimNotifikasi()
 *  9. simpan kejadian risiko tinggi sebagai riwayat (per kab/kota per hari)
 * Dipakai halaman/API (lihatKondisiWilayah) dan cron (ambilCuacaSel + risikoDesa + tindakLanjutRisiko).
 */
import type { DataCuaca, LevelRisiko, TingkatRisiko, Wilayah } from "@prisma/client";
import { after } from "next/server";
import { UMUR_SEGARKAN_MS } from "@/lib/constants";
import { titikDariKunci } from "@/lib/grid";
import { ISI_PERSIAPAN_CATAT_NOMOR, isiPersiapanCatatNomor } from "@/lib/kontak-darurat";
import type { PenangananKlien, RisikoKlien } from "@/lib/tipe-risiko";
import { db } from "@/server/db";
import type { OpenMeteoResponse } from "@/server/integrations/open-meteo";
import { lihatPersiapan, lihatRekomendasi } from "@/server/services/content.service";
import { prosesPeringatan, type RingkasanPeringatan } from "@/server/services/notification.service";
import { evaluasiDanSimpanRisiko, simulasiAktif } from "@/server/services/risk.service";
import { simpanRiwayatRisikoTinggi, type HasilRiwayat } from "@/server/services/riwayat.service";
import { lihatDataCuaca, type HasilDataCuaca } from "@/server/services/weather.service";
import { lihatDesa, lihatWilayahLengkap, namaInduk, namaTampilan, nomorDaruratWilayah } from "@/server/services/wilayah.service";
import { daftarHasilParameterSchema } from "@/server/validators/risiko";

/** Langkah 4: data cuaca sel grid (cache 30 menit, pengaman kuota). */
export async function ambilCuacaSel(
  kunciGrid: string,
  opsi: { paksa?: boolean; batasKuota?: number; umurMaksMs?: number } = {},
) {
  return lihatDataCuaca(titikDariKunci(kunciGrid), opsi);
}

/**
 * Langkah 5 untuk satu desa. Satu LevelRisiko per (desa, DataCuaca): `risikoBaru` terisi jika
 * baru saja dihitung, sehingga tindak lanjut (notifikasi & riwayat) hanya sekali per data.
 * Jika status simulasi berubah (diaktifkan/dipulihkan), risiko dihitung ulang dari data yang
 * sama, jadi simulasi tidak memakai kuota Open-Meteo (D-041).
 */
export async function risikoDesa(idWilayah: string, cuaca: { dataCuaca: DataCuaca; raw: OpenMeteoResponse }) {
  const [terakhir, simulasi] = await Promise.all([
    db.levelRisiko.findFirst({
      where: { idCuaca: cuaca.dataCuaca.idCuaca, idWilayah },
      orderBy: { waktu: "desc" },
    }),
    simulasiAktif(idWilayah),
  ]);
  const ada = terakhir && terakhir.simulasi === (simulasi != null) ? terakhir : null;
  const risikoBaru = ada ? null : await evaluasiDanSimpanRisiko(idWilayah, cuaca.dataCuaca, cuaca.raw, simulasi);
  const risiko = (ada ?? risikoBaru) as LevelRisiko;
  const parsed = daftarHasilParameterSchema.safeParse(risiko.parameterPemicu);
  return { risiko: { ...risiko, hasilPerParameter: parsed.success ? parsed.data : [] }, risikoBaru };
}

export type HasilTindakLanjut = { notifikasi: RingkasanPeringatan; riwayat: HasilRiwayat };

/** Langkah 8–9: kirim peringatan (Sedang/Tinggi) dan simpan riwayat (Tinggi). */
export async function tindakLanjutRisiko(risiko: LevelRisiko): Promise<HasilTindakLanjut> {
  const [notifikasi, riwayat] = await Promise.all([prosesPeringatan(risiko), simpanRiwayatRisikoTinggi(risiko)]);
  return { notifikasi, riwayat };
}

/** Pantau satu desa (langkah 4–5). */
export async function pantauWilayah(
  wilayah: Pick<Wilayah, "idWilayah" | "kunciGrid">,
  opsi: { paksa?: boolean; umurMaksMs?: number } = {},
) {
  if (!wilayah.kunciGrid) return { cuaca: null, risiko: null, risikoBaru: null };
  const cuaca = await ambilCuacaSel(wilayah.kunciGrid, opsi);
  if (!cuaca) return { cuaca: null, risiko: null, risikoBaru: null };
  const { risiko, risikoBaru } = await risikoDesa(wilayah.idWilayah, cuaca);
  return { cuaca, risiko, risikoBaru };
}

/**
 * Data cuaca + level risiko terkini untuk satu desa/kelurahan.
 * null jika kode bukan desa/kelurahan aktif (pengguna harus memilih sampai tingkat desa).
 * `segarkan` (tombol Perbarui): ambil ulang dari Open-Meteo bila data sel grid ≥ 15 menit (D-057).
 */
export async function lihatKondisiWilayah(idWilayah: string, opsi: { segarkan?: boolean } = {}) {
  const desa = await lihatDesa(idWilayah);
  if (!desa) return null;

  const { cuaca, risiko, risikoBaru } = await pantauWilayah(desa.wilayah, {
    umurMaksMs: opsi.segarkan ? UMUR_SEGARKAN_MS : undefined,
  });

  // Tindak lanjut dijalankan setelah respons terkirim agar halaman tidak menunggu push service.
  if (risikoBaru && risikoBaru.level !== "RENDAH") {
    after(async () => {
      try {
        const hasil = await tindakLanjutRisiko(risikoBaru);
        console.info(`[pemantauan] ${risikoBaru.idWilayah} ${risikoBaru.level}:`, hasil);
      } catch (err) {
        console.error(`[pemantauan] Tindak lanjut gagal untuk ${risikoBaru.idWilayah}:`, err);
      }
    });
  }

  return { wilayah: desa.wilayah, leluhur: desa.leluhur, cuaca, risiko };
}

export type KondisiWilayah = NonNullable<Awaited<ReturnType<typeof lihatKondisiWilayah>>>;

/** Bentuk JSON risiko untuk klien (API & state machine). */
export function keRisikoKlien(kondisi: KondisiWilayah): RisikoKlien | null {
  const { wilayah, leluhur, cuaca, risiko } = kondisi;
  if (!cuaca || !risiko) return null;
  return {
    idRisiko: risiko.idRisiko,
    idWilayah: wilayah.idWilayah,
    namaWilayah: namaTampilan(leluhur),
    namaInduk: namaInduk(leluhur),
    koordinatPerkiraan: wilayah.koordinatPerkiraan,
    level: risiko.level,
    simulasi: risiko.simulasi,
    skorRisiko: risiko.skorRisiko,
    deskripsi: risiko.deskripsi,
    parameter: risiko.hasilPerParameter,
    waktu: risiko.waktu.toISOString(),
    sumberData: cuaca.sumber,
    waktuAmbilData: cuaca.dataCuaca.waktuAmbil.toISOString(),
  };
}

/** Level → Persiapan Dini → Rekomendasi (alur bertingkat use case). */
export async function lihatPenanganan(idWilayah: string, level: TingkatRisiko): Promise<PenangananKlien> {
  const [persiapan, rekomendasi] = await Promise.all([
    lihatPersiapanWilayah(level, idWilayah),
    lihatRekomendasi(level, idWilayah),
  ]);
  return {
    level,
    persiapan: persiapan.map(({ idPersiapan, isiPersiapan }) => ({ idPersiapan, isiPersiapan })),
    rekomendasi: rekomendasi.map(({ idRekomendasi, isiRekomendasi, bagian, sumberNama, sumberUrl }) => ({
      idRekomendasi,
      isiRekomendasi,
      bagian,
      sumberNama,
      sumberUrl,
    })),
  };
}

/**
 * lihatPersiapan() untuk satu desa, dengan butir "Catat nomor darurat 112 …" disesuaikan status
 * layanan 112 kab/kota-nya (D-051). Dipakai halaman Risiko dan GET /api/persiapan.
 */
export async function lihatPersiapanWilayah(level: TingkatRisiko, idWilayah: string) {
  const [persiapan, lengkap] = await Promise.all([lihatPersiapan(level, idWilayah), lihatWilayahLengkap(idWilayah)]);
  if (!lengkap || !persiapan.some((p) => p.isiPersiapan === ISI_PERSIAPAN_CATAT_NOMOR)) return persiapan;
  const isi = isiPersiapanCatatNomor(nomorDaruratWilayah(lengkap.leluhur));
  return persiapan.map((p) => (p.isiPersiapan === ISI_PERSIAPAN_CATAT_NOMOR ? { ...p, isiPersiapan: isi } : p));
}

export type { HasilDataCuaca };
