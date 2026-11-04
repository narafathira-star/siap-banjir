/**
 * Rule engine risiko banjir (inti sistem).
 * Ambang batas TIDAK di-hard-code; semuanya dibaca dari tabel AmbangRisiko.
 */
import type { AmbangRisiko, DataCuaca, ParameterRisiko, SimulasiCuaca, TingkatRisiko } from "@prisma/client";
import { db } from "@/server/db";
import type { OpenMeteoResponse } from "@/server/integrations/open-meteo";
import { hitungParameterCuaca, type NilaiParameter } from "@/server/services/parameter-cuaca";
import { leluhurKode } from "@/lib/kode-wilayah";
import { LABEL_LEVEL, LABEL_SIMULASI, PARAMETER_RISIKO, URUTAN_LEVEL, formatNilaiParameter } from "@/lib/risiko";
import type { HasilParameter } from "@/server/validators/risiko";

export type AmbangAcuan = Pick<
  AmbangRisiko,
  "idWilayah" | "parameter" | "nilaiMinimum" | "nilaiMaksimum" | "levelRisiko"
>;

export type HasilRisiko = {
  level: TingkatRisiko;
  skorRisiko: number;
  /** Parameter yang levelnya sama dengan level akhir, skor tertinggi dulu. */
  parameterPemicu: HasilParameter[];
  /** Semua parameter yang punya nilai dan ambang. */
  hasilPerParameter: HasilParameter[];
  /** false jika tidak ada satu pun parameter yang bisa dievaluasi. */
  adaData: boolean;
};

// Skor 0–100 dibagi per level agar selalu konsisten dengan level:
// RENDAH 0–33, SEDANG 34–66, TINGGI 67–100.
const RENTANG_SKOR: Record<TingkatRisiko, { dasar: number; lebar: number }> = {
  RENDAH: { dasar: 0, lebar: 33 },
  SEDANG: { dasar: 34, lebar: 32 },
  TINGGI: { dasar: 67, lebar: 33 },
};

function cocok(nilai: number, ambang: AmbangAcuan) {
  return nilai >= ambang.nilaiMinimum && (ambang.nilaiMaksimum == null || nilai < ambang.nilaiMaksimum);
}

function hitungSkor(nilai: number, ambang: AmbangAcuan) {
  const { dasar, lebar } = RENTANG_SKOR[ambang.levelRisiko];
  // Rentang tanpa batas atas: skor penuh saat nilai = 2 × nilaiMinimum.
  const pembagi =
    ambang.nilaiMaksimum != null
      ? ambang.nilaiMaksimum - ambang.nilaiMinimum
      : Math.max(ambang.nilaiMinimum, 1);
  const posisi = Math.min(Math.max((nilai - ambang.nilaiMinimum) / pembagi, 0), 1);
  return Math.round(dasar + posisi * lebar);
}

/** 0 = global, 1 = provinsi, 2 = kab/kota, 3 = kecamatan, 4 = desa/kelurahan. */
const kedalaman = (idWilayah: string | null) => (idWilayah == null ? 0 : idWilayah.split(".").length);

/**
 * Pilih ambang yang berlaku per parameter secara hierarkis: untuk setiap parameter dipakai
 * ambang dari tingkat paling spesifik yang punya ambang (desa > kecamatan > kab/kota >
 * provinsi > global). `ambangList` berisi ambang global + ambang milik wilayah dan leluhurnya.
 */
export function pilihAmbangEfektif(ambangList: AmbangAcuan[]): Map<ParameterRisiko, AmbangAcuan[]> {
  const perParameter = new Map<ParameterRisiko, AmbangAcuan[]>();
  for (const a of ambangList) perParameter.set(a.parameter, [...(perParameter.get(a.parameter) ?? []), a]);
  return new Map(
    [...perParameter].map(([p, daftar]) => {
      const terdalam = Math.max(...daftar.map((a) => kedalaman(a.idWilayah)));
      return [p, daftar.filter((a) => kedalaman(a.idWilayah) === terdalam)];
    }),
  );
}

/** cekAmbang(dataCuaca, ambangList): hasil perbandingan per parameter. */
export function cekAmbang(nilai: NilaiParameter, ambangList: AmbangAcuan[]): HasilParameter[] {
  const hasil: HasilParameter[] = [];
  for (const [parameter, daftar] of pilihAmbangEfektif(ambangList)) {
    const v = nilai[parameter];
    if (v === undefined || !Number.isFinite(v)) continue;
    // Jika rentang tumpang tindih (salah konfigurasi), ambil level tertinggi.
    const terpilih = daftar
      .filter((a) => cocok(v, a))
      .sort((x, y) => URUTAN_LEVEL[y.levelRisiko] - URUTAN_LEVEL[x.levelRisiko])[0];
    if (!terpilih) continue;
    hasil.push({
      parameter,
      nilai: v,
      level: terpilih.levelRisiko,
      skor: hitungSkor(v, terpilih),
      ambangKhusus: terpilih.idWilayah != null,
      pemicu: false,
    });
  }
  return hasil;
}

/** hitungLevelRisiko(dataCuaca): level akhir = level tertinggi dari semua parameter. */
export function hitungLevelRisiko(nilai: NilaiParameter, ambangList: AmbangAcuan[]): HasilRisiko {
  const hasil = cekAmbang(nilai, ambangList);
  if (hasil.length === 0) {
    return { level: "RENDAH", skorRisiko: 0, parameterPemicu: [], hasilPerParameter: [], adaData: false };
  }

  const level = hasil.reduce<TingkatRisiko>(
    (maks, h) => (URUTAN_LEVEL[h.level] > URUTAN_LEVEL[maks] ? h.level : maks),
    "RENDAH",
  );
  const hasilPerParameter = hasil
    .map((h) => ({ ...h, pemicu: h.level === level }))
    .sort((a, b) => b.skor - a.skor);

  return {
    level,
    skorRisiko: Math.max(...hasil.map((h) => h.skor)),
    parameterPemicu: hasilPerParameter.filter((h) => h.pemicu),
    hasilPerParameter,
    adaData: true,
  };
}

/** Kalimat ringkas, misalnya "Risiko TINGGI karena curah hujan 24 jam terakhir 72 mm." */
export function buatDeskripsiRisiko(hasil: HasilRisiko) {
  if (!hasil.adaData) return "Data cuaca belum cukup untuk menghitung risiko.";
  const utama = hasil.parameterPemicu[0];
  if (hasil.level === "RENDAH" || !utama) {
    return "Risiko RENDAH. Tidak ada parameter yang melewati ambang Sedang.";
  }
  const label = PARAMETER_RISIKO[utama.parameter].label.toLowerCase();
  return `Risiko ${LABEL_LEVEL[hasil.level].toUpperCase()} karena ${label} ${formatNilaiParameter(utama.parameter, utama.nilai)}.`;
}

/**
 * Simulasi hujan (D-041): hujan 24 jam terakhir diganti nilai simulasi (jika lebih besar dari
 * data asli), dan akumulasi 3 hari minimal sama dengannya. Parameter lain tetap data asli.
 * Level tetap ditentukan oleh ambang asli.
 */
export function terapkanSimulasi(nilai: NilaiParameter, hujan24Jam: number): NilaiParameter {
  return {
    ...nilai,
    hujan_24jam: Math.max(nilai.hujan_24jam ?? 0, hujan24Jam),
    hujan_3hari: Math.max(nilai.hujan_3hari ?? 0, hujan24Jam),
  };
}

// ---------- Operasi yang mengakses DB ----------

/** Ambang global + ambang milik wilayah dan semua leluhurnya (untuk pewarisan hierarkis). */
export async function ambilAmbangWilayah(idWilayah: string) {
  return db.ambangRisiko.findMany({
    where: { OR: [{ idWilayah: { in: leluhurKode(idWilayah) } }, { idWilayah: null }] },
  });
}

export type SimulasiAcuan = Pick<SimulasiCuaca, "idWilayah" | "hujan24Jam">;

/** Simulasi yang berlaku untuk wilayah ini (milik wilayah itu atau leluhur terdekat), atau null. */
export async function simulasiAktif(idWilayah: string): Promise<SimulasiAcuan | null> {
  const daftar = await db.simulasiCuaca.findMany({
    where: { idWilayah: { in: leluhurKode(idWilayah) } },
    select: { idWilayah: true, hujan24Jam: true },
  });
  return daftar.sort((a, b) => kedalaman(b.idWilayah) - kedalaman(a.idWilayah))[0] ?? null;
}

/**
 * Langkah 5 sequence diagram: hitung risiko wilayah dari DataCuaca (milik sel grid wilayah itu)
 * lalu simpan LevelRisiko. `simulasi` undefined = dicari sendiri.
 */
export async function evaluasiDanSimpanRisiko(
  idWilayah: string,
  dataCuaca: DataCuaca,
  raw: OpenMeteoResponse,
  simulasi?: SimulasiAcuan | null,
) {
  const [ambangList, sim] = await Promise.all([
    ambilAmbangWilayah(idWilayah),
    simulasi === undefined ? simulasiAktif(idWilayah) : simulasi,
  ]);
  const nilai = hitungParameterCuaca(raw);
  const hasil = hitungLevelRisiko(sim ? terapkanSimulasi(nilai, sim.hujan24Jam) : nilai, ambangList);
  const deskripsi = buatDeskripsiRisiko(hasil);
  return db.levelRisiko.create({
    data: {
      idWilayah,
      idCuaca: dataCuaca.idCuaca,
      level: hasil.level,
      skorRisiko: hasil.skorRisiko,
      // Label di deskripsi agar setiap tampilan (halaman, API) jelas menyebut simulasi.
      deskripsi: sim ? `${LABEL_SIMULASI} ${deskripsi}` : deskripsi,
      parameterPemicu: hasil.hasilPerParameter,
      simulasi: sim != null,
    },
  });
}
