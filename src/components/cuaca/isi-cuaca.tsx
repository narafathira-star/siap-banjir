"use client";

import { useState } from "react";
import { usePembaruanOtomatis } from "@/hooks/usePembaruanOtomatis";
import { ambilDataWilayah, type DataHalamanCuaca } from "@/lib/ambil-data-wilayah";
import { zonaWilayah } from "@/lib/zona-waktu";
import { GrafikPrakiraanJam } from "./grafik-prakiraan-jam";
import { KartuCuaca } from "./kartu-cuaca";
import { PrakiraanHarian } from "./prakiraan-harian";
import { StatusData } from "./status-data";

/**
 * Isi halaman Cuaca untuk wilayah terpilih. Data awal dirender server; pembaruan otomatis 30 menit
 * (dan saat kembali ke tab) mengambil ulang lewat `ambilDataWilayah` dan menerapkannya ke state ini (D-056).
 * Gagal: data terakhir tetap tampil; percobaan berikutnya 30 menit lagi atau saat kembali ke tab.
 */
export function IsiCuaca({ idWilayah, awal }: { idWilayah: string; awal: DataHalamanCuaca }) {
  const [data, setData] = useState(awal);

  usePembaruanOtomatis(async () => {
    try {
      setData((await ambilDataWilayah(idWilayah)).cuaca);
    } catch {
      // Tanpa tombol di halaman ini; data lama tetap tampil.
    }
  });

  const waktuAmbil = new Date(data.waktuAmbil);
  // Jam & tanggal prakiraan dari server sudah dalam zona wilayah (D-060).
  const zona = zonaWilayah(idWilayah);
  const dataLama = data.sumber === "cadangan" || data.sumber === "hemat-kuota";

  return (
    <>
      <KartuCuaca dataCuaca={data.terkini} waktuAmbil={waktuAmbil} zona={zona} koordinatPerkiraan={data.koordinatPerkiraan} />
      {dataLama && <StatusData sumber={data.sumber} waktuAmbil={waktuAmbil} zona={zona} />}
      <PrakiraanHarian harian={data.harian} />
      <section aria-labelledby="judul-jam" className="flex flex-col gap-3 rounded-[20px] border bg-card p-4 text-card-foreground">
        <h2 id="judul-jam" className="text-[18px] font-extrabold">
          Prakiraan per jam
        </h2>
        <GrafikPrakiraanJam hari={data.perJamPerHari} zona={zona} />
      </section>
    </>
  );
}
