import { Suspense } from "react";
import type { Metadata } from "next";
import { IsiCuaca } from "@/components/cuaca/isi-cuaca";
import { KepalaHalaman } from "@/components/layout/kepala-halaman";
import { PilihWilayah } from "@/components/wilayah/pilih-wilayah";
import { SkeletonRingkasan } from "@/components/wilayah/skeleton";
import { TandaKontenWilayah } from "@/components/wilayah/tanda-konten-wilayah";
import { BelumPilihWilayah, DataCuacaTidakTersedia } from "@/components/wilayah/status-kosong";
import { lihatKondisiWilayah } from "@/server/services/pemantauan.service";
import { ringkasanHarian, seriPerJamPerHari } from "@/server/services/seri-cuaca";
import { muatPemilih } from "@/server/wilayah-terpilih";
import { zonaWilayah } from "@/lib/zona-waktu";

export const metadata: Metadata = { title: "Prakiraan Cuaca" };

type Props = { searchParams: Promise<{ wilayah?: string | string[] }> };

/**
 * Cuaca (desain ulang, D-052): judul + wilayah → cuaca terkini → prakiraan harian → prakiraan per jam (satu hari, pilih lewat tab).
 * Tanpa wilayah: pemilih wilayah.
 */
export default async function CuacaPage({ searchParams }: Props) {
  const { wilayah } = await searchParams;
  const { pemilih, desa, namaTerpilih } = await muatPemilih(wilayah);
  const terpilih = desa?.wilayah.idWilayah ?? null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <KepalaHalaman
        judul="Prakiraan Cuaca"
        subjudul="Prakiraan 3 hari, harian dan per jam."
        namaWilayah={terpilih ? namaTerpilih : null}
      />
      {terpilih ? (
        <Suspense key={terpilih} fallback={<SkeletonRingkasan />}>
          <Prakiraan idWilayah={terpilih} />
          <TandaKontenWilayah idWilayah={terpilih} />
        </Suspense>
      ) : (
        <>
          <BelumPilihWilayah />
          <section aria-label="Pilih wilayah" className="rounded-[20px] border bg-card p-4">
            <PilihWilayah data={pemilih} namaTerpilih={namaTerpilih} tungguKonten />
          </section>
        </>
      )}
    </div>
  );
}

async function Prakiraan({ idWilayah }: { idWilayah: string }) {
  const kondisi = await lihatKondisiWilayah(idWilayah);
  if (!kondisi) return <BelumPilihWilayah />;
  if (!kondisi.cuaca) return <DataCuacaTidakTersedia />;

  const { wilayah, cuaca } = kondisi;
  const { suhu, kelembapan, curahHujan, kecepatanAngin, kondisiCuaca, waktuAmbil } = cuaca.dataCuaca;
  const waktu = waktuAmbil.toISOString();
  const zona = zonaWilayah(idWilayah);

  // key: data server baru (navigasi) menggantikan state klien; pembaruan berkala lewat state klien (D-056).
  return (
    <IsiCuaca
      key={waktu}
      idWilayah={idWilayah}
      awal={{
        terkini: { suhu, kelembapan, curahHujan, kecepatanAngin, kondisiCuaca },
        waktuAmbil: waktu,
        sumber: cuaca.sumber,
        koordinatPerkiraan: wilayah.koordinatPerkiraan,
        harian: ringkasanHarian(cuaca.raw, zona),
        perJamPerHari: seriPerJamPerHari(cuaca.raw, zona),
      }}
    />
  );
}
