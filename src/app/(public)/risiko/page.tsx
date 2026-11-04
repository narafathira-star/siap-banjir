import { Suspense } from "react";
import type { Metadata } from "next";
import { KepalaHalaman } from "@/components/layout/kepala-halaman";
import { Disclaimer } from "@/components/risiko/disclaimer";
import { PanelRisiko } from "@/components/risiko/panel-risiko";
import { PilihWilayah } from "@/components/wilayah/pilih-wilayah";
import { SkeletonRingkasan } from "@/components/wilayah/skeleton";
import { TandaKontenWilayah } from "@/components/wilayah/tanda-konten-wilayah";
import { BelumPilihWilayah, DataCuacaTidakTersedia } from "@/components/wilayah/status-kosong";
import { keRisikoKlien, lihatKondisiWilayah, lihatPenanganan } from "@/server/services/pemantauan.service";
import { seriHujan48Jam } from "@/server/services/seri-cuaca";
import { muatPemilih } from "@/server/wilayah-terpilih";
import { zonaWilayah } from "@/lib/zona-waktu";

export const metadata: Metadata = { title: "Risiko Banjir" };

type Props = { searchParams: Promise<{ wilayah?: string | string[] }> };

/**
 * Risiko (desain ulang, D-047): judul + wilayah → disclaimer → status pemantauan → kartu level →
 * arti level → parameter → (grafik saat Bahaya) → penanganan → kontak. Tanpa wilayah: pemilih wilayah.
 */
export default async function RisikoPage({ searchParams }: Props) {
  const { wilayah } = await searchParams;
  const { pemilih, desa, namaTerpilih } = await muatPemilih(wilayah);
  const terpilih = desa?.wilayah.idWilayah ?? null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <KepalaHalaman
        judul="Risiko Banjir"
        subjudul="Level risiko, persiapan dini, dan rekomendasi tindakan."
        namaWilayah={terpilih ? namaTerpilih : null}
      />
      <Disclaimer />
      {terpilih ? (
        <Suspense key={terpilih} fallback={<SkeletonRingkasan />}>
          <DetailRisiko idWilayah={terpilih} />
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

/** Data awal dirender server; state machine di PanelRisiko mengambil alih di browser. */
async function DetailRisiko({ idWilayah }: { idWilayah: string }) {
  const kondisi = await lihatKondisiWilayah(idWilayah);
  if (!kondisi) return <BelumPilihWilayah />;
  const risiko = keRisikoKlien(kondisi);
  if (!risiko || !kondisi.cuaca) return <DataCuacaTidakTersedia />;

  // Level Risiko → Lihat Persiapan Dini → Lihat Rekomendasi (konten diwariskan dari leluhur).
  const penanganan = await lihatPenanganan(idWilayah, risiko.level);

  return (
    <PanelRisiko
      key={idWilayah}
      risiko={risiko}
      grafik={seriHujan48Jam(kondisi.cuaca.raw, zonaWilayah(idWilayah))}
      penanganan={penanganan}
    />
  );
}
