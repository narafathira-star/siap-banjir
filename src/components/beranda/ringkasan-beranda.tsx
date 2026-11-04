"use client";

import { useState } from "react";
import { StatusData } from "@/components/cuaca/status-data";
import { usePembaruanOtomatis } from "@/hooks/usePembaruanOtomatis";
import { ambilDataWilayah, type CuacaTerkini } from "@/lib/ambil-data-wilayah";
import { formatJamZona } from "@/lib/format";
import { teksHasilCek } from "@/lib/hasil-cek";
import { zonaWilayah } from "@/lib/zona-waktu";
import { formatNilaiParameter } from "@/lib/risiko";
import type { RisikoKlien } from "@/lib/tipe-risiko";
import { KartuCuacaRingkas, TautanKontakDarurat } from "./kartu-ringkas";
import { KartuPeringatanDini } from "./kartu-peringatan-dini";
import { PanelLevel } from "./panel-level";
import { TombolPerbaruiData, type HasilPerbarui } from "./tombol-perbarui-data";

/**
 * Isi Beranda untuk wilayah terpilih. Data awal dirender server; tombol jam pembaruan mengambil ulang
 * lewat `ambilDataWilayah` (sama dengan tombol Perbarui di Risiko) dan menerapkannya ke state ini (D-055).
 * Pembaruan otomatis 30 menit & saat kembali ke tab memakai fungsi yang sama (D-056).
 * Tombol meminta data Open-Meteo baru bila data ≥ 15 menit dan menampilkan hasil cek (D-057).
 */
export function RingkasanBeranda({
  awal,
  namaWilayah,
}: {
  awal: { risiko: RisikoKlien; terkini: Pick<CuacaTerkini, "suhu" | "kondisiCuaca"> };
  namaWilayah: string;
}) {
  const [data, setData] = useState(awal);
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<HasilPerbarui>(null);
  const { risiko, terkini } = data;
  const idWilayah = risiko.idWilayah;
  const zona = zonaWilayah(idWilayah);

  const perbaruiSekarang = usePembaruanOtomatis(perbarui);

  async function perbarui({ manual }: { manual: boolean }) {
    setMemuat(true);
    setHasil(null);
    try {
      const baru = await ambilDataWilayah(idWilayah, { segarkan: manual });
      setData({ risiko: baru.risiko, terkini: baru.terkini });
      const teks = teksHasilCek({
        dicek: new Date(),
        waktuDataSebelum: risiko.waktuAmbilData,
        waktuData: baru.risiko.waktuAmbilData,
        sumber: baru.risiko.sumberData,
        zona,
      });
      // Pembaruan otomatis cukup mengganti jam di tombol; hasil cek hanya untuk tombol.
      setHasil(manual ? { status: "selesai", teks } : null);
    } catch (err) {
      setHasil({ status: "galat", pesan: err instanceof Error ? err.message : "Gagal memuat data" });
    } finally {
      setMemuat(false);
    }
  }

  const waktuData = new Date(risiko.waktuAmbilData);
  const hujan24 = risiko.parameter.find((p) => p.parameter === "hujan_24jam");
  const dataLama = risiko.sumberData === "cadangan" || risiko.sumberData === "hemat-kuota";

  return (
    <>
      <PanelLevel
        level={risiko.level}
        deskripsi={risiko.deskripsi}
        simulasi={risiko.simulasi}
        idWilayah={idWilayah}
        tombolPerbarui={
          <TombolPerbaruiData jam={formatJamZona(waktuData, zona)} memuat={memuat} hasil={hasil} onPerbarui={() => void perbaruiSekarang()} />
        }
      />
      {dataLama && <StatusData sumber={risiko.sumberData} waktuAmbil={waktuData} zona={zona} />}
      <div className="grid grid-cols-2 gap-3">
        <KartuCuacaRingkas
          suhu={terkini.suhu}
          kodeCuaca={terkini.kondisiCuaca}
          hujan24Jam={hujan24 ? { teks: formatNilaiParameter("hujan_24jam", hujan24.nilai), level: hujan24.level } : null}
        />
        <KartuPeringatanDini wilayah={{ idWilayah, namaWilayah }} />
      </div>
      <TautanKontakDarurat href={`/kontak?wilayah=${idWilayah}`} tinggi={risiko.level === "TINGGI"} />
    </>
  );
}
