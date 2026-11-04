import { Suspense } from "react";
import { WilayahDipantau } from "@/components/beranda/kartu-ringkas";
import { RingkasanBeranda } from "@/components/beranda/ringkasan-beranda";
import { PilihWilayah } from "@/components/wilayah/pilih-wilayah";
import { SkeletonRingkasan } from "@/components/wilayah/skeleton";
import { TandaKontenWilayah } from "@/components/wilayah/tanda-konten-wilayah";
import { BelumPilihWilayah, DataCuacaTidakTersedia } from "@/components/wilayah/status-kosong";
import { APP_NAME } from "@/lib/constants";
import { keRisikoKlien, lihatKondisiWilayah } from "@/server/services/pemantauan.service";
import { muatPemilih } from "@/server/wilayah-terpilih";

type Props = { searchParams: Promise<{ wilayah?: string | string[] }> };

/**
 * Beranda (desain ulang, D-046): wilayah dipantau → level risiko dengan ilustrasi air →
 * cuaca & peringatan dini → kontak darurat. Tanpa wilayah: pemilih wilayah langsung di sini.
 */
export default async function BerandaPage({ searchParams }: Props) {
  const { wilayah } = await searchParams;
  // lihatInformasi(wilayah): pemilih wilayah + info cuaca awal (langkah 1 sequence diagram).
  const { pemilih, desa, namaTerpilih } = await muatPemilih(wilayah);
  const terpilih = desa?.wilayah.idWilayah ?? null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="sr-only">{APP_NAME}: Beranda</h1>

      {terpilih && namaTerpilih ? (
        <>
          <WilayahDipantau nama={namaTerpilih} />
          <Suspense key={terpilih} fallback={<SkeletonRingkasan />}>
            <RingkasanWilayah idWilayah={terpilih} namaWilayah={namaTerpilih} />
            <TandaKontenWilayah idWilayah={terpilih} />
          </Suspense>
        </>
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

async function RingkasanWilayah({ idWilayah, namaWilayah }: { idWilayah: string; namaWilayah: string }) {
  const kondisi = await lihatKondisiWilayah(idWilayah);
  if (!kondisi) return <BelumPilihWilayah />;
  const risiko = keRisikoKlien(kondisi);
  if (!risiko || !kondisi.cuaca) return <DataCuacaTidakTersedia />;

  const { suhu, kondisiCuaca } = kondisi.cuaca.dataCuaca;
  // key: data server baru (navigasi) menggantikan state klien; pembaruan berkala lewat state klien (D-056).
  return (
    <RingkasanBeranda
      key={`${risiko.idRisiko}:${risiko.waktuAmbilData}`}
      awal={{ risiko, terkini: { suhu, kondisiCuaca } }}
      namaWilayah={namaWilayah}
    />
  );
}
