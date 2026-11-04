"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, LoaderCircle, Phone, RefreshCw } from "lucide-react";
import { AtribusiOpenMeteo } from "@/components/cuaca/atribusi-open-meteo";
import { GrafikHujan48Jam } from "@/components/cuaca/grafik-hujan-48jam";
import { StatusData } from "@/components/cuaca/status-data";
import { useNotifikasi } from "@/components/notifikasi/notifikasi-provider";
import { useRiskState } from "@/hooks/useRiskState";
import { LABEL_STATE, type TabPenanganan } from "@/lib/mesin-risiko";
import { LABEL_LEVEL, URUTAN_LEVEL } from "@/lib/risiko";
import type { PenangananKlien, RisikoKlien } from "@/lib/tipe-risiko";
import { cn } from "@/lib/utils";
import { zonaWilayah } from "@/lib/zona-waktu";
import type { TitikGrafikJam } from "@/server/services/seri-cuaca";
import { BannerStatus } from "./banner-status";
import { DaftarParameter } from "./daftar-parameter";
import { GAYA_LEVEL } from "./gaya-level";
import { KartuLevelRisiko } from "./kartu-level-risiko";
import { PenangananTabs } from "./penanganan-tabs";

/** Kartu putih halaman Risiko (kanvas desain ulang). */
const KARTU = "flex flex-col rounded-[18px] border bg-card p-4 text-card-foreground";
const JUDUL_KARTU = "text-[18px] font-extrabold";

const LEVEL = Object.keys(URUTAN_LEVEL) as (keyof typeof URUTAN_LEVEL)[];

function ArtiLevel() {
  return (
    <details open className="group rounded-[18px] border bg-card px-4 pt-1 pb-4">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-[16px] font-extrabold [&::-webkit-details-marker]:hidden">
        Apa arti setiap level?
        <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <dl className="flex flex-col gap-2.5">
        {LEVEL.map((l) => (
          <div key={l} className="flex items-start gap-3">
            <dt className={cn("w-[76px] shrink-0 rounded-lg py-[5px] text-center text-[13px] font-extrabold", GAYA_LEVEL[l].solid)}>
              {LABEL_LEVEL[l]}
            </dt>
            <dd className="text-[14px] leading-normal text-[#1f2937]">{GAYA_LEVEL[l].arti}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function PanelRisiko({
  risiko,
  grafik: grafikAwal,
  penanganan: penangananAwal,
}: {
  risiko: RisikoKlien;
  grafik: TitikGrafikJam[];
  penanganan: PenangananKlien;
}) {
  const { ktx, kirim, grafik, penanganan, muatUlang, hasilCek, grafikSelesaiRender } = useRiskState({
    idWilayah: risiko.idWilayah,
    risiko,
    grafik: grafikAwal,
    penanganan: penangananAwal,
  });
  const { bukaDialogIzin } = useNotifikasi();
  const [tabLokal, setTabLokal] = useState<TabPenanganan>("checklist");
  const refPenanganan = useRef<HTMLHeadingElement>(null);

  const s = ktx.state;
  const data = s.data ?? risiko;
  const diPenanganan = s.nama === "penanganan";
  const dataLama = data.sumberData === "cadangan" || data.sumberData === "hemat-kuota";
  // D-048: grafik (jalur 2 state Bahaya, D-024) tampil di Bahaya dan Detail Penanganan saja,
  // tidak di Pemantauan dan Final.
  const tampilGrafik = s.nama === "bahaya" || diPenanganan;

  // Entry Detail Penanganan: arahkan pengguna ke checklist.
  useEffect(() => {
    if (!diPenanganan) return;
    const halus = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    refPenanganan.current?.scrollIntoView({ behavior: halus ? "smooth" : "auto", block: "start" });
    refPenanganan.current?.focus({ preventScroll: true });
  }, [diPenanganan]);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex flex-wrap items-center gap-2 text-[14px] text-[#3e4a5c]">
          Status pemantauan
          <span className="rounded-full bg-primary-lembut px-2.5 py-1 text-[13px] font-bold text-primary-hover">
            {LABEL_STATE[s.nama]}
          </span>
        </p>
        <button
          type="button"
          onClick={() => void muatUlang()}
          disabled={ktx.memuat}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[#c6cfdc] bg-card px-3.5 text-[14px] font-bold text-foreground hover:bg-[#f7f9fc] disabled:opacity-60"
        >
          {ktx.memuat ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" strokeWidth={2.2} aria-hidden="true" />
          )}
          Perbarui
        </button>
      </div>
      {ktx.galat ? (
        <p role="status" className="text-[14px] text-destructive">
          Gagal memperbarui: {ktx.galat}. Menampilkan data terakhir.
        </p>
      ) : null}
      {/* Hasil cek tombol Perbarui (D-057); kosong saat memuat agar pengumuman berikutnya terbaca ulang. */}
      <p role="status" className={hasilCek && !ktx.memuat ? "text-[14px] leading-snug text-[#3e4a5c]" : "sr-only"}>
        {ktx.memuat ? "" : hasilCek}
      </p>

      <BannerStatus
        state={s}
        onTutup={() => kirim({ type: "TUTUP" })}
        onLanjutPantau={() => kirim({ type: "LANJUT_PANTAU" })}
        onAktifkanNotifikasi={() => bukaDialogIzin({ idWilayah: data.idWilayah, namaWilayah: data.namaWilayah })}
      />

      <KartuLevelRisiko data={data} />
      {dataLama && (
        <StatusData sumber={data.sumberData} waktuAmbil={new Date(data.waktuAmbilData)} zona={zonaWilayah(data.idWilayah)} />
      )}

      <ArtiLevel />

      <section aria-labelledby="judul-param" className={cn(KARTU, "gap-1")}>
        <h2 id="judul-param" className={cn(JUDUL_KARTU, "mb-2")}>
          Parameter pemicu
        </h2>
        <DaftarParameter hasil={data.parameter} />
      </section>

      {tampilGrafik && (
        <section aria-labelledby="judul-grafik" className={cn(KARTU, "gap-3")}>
          <h2 id="judul-grafik" className={JUDUL_KARTU}>
            Curah hujan 48 jam
          </h2>
          <GrafikHujan48Jam
            zona={zonaWilayah(data.idWilayah)}
            data={grafik}
            onSelesaiRender={s.nama === "bahaya" && s.jalurGrafik === "menyiapkan-grafik" ? grafikSelesaiRender : undefined}
          />
          <AtribusiOpenMeteo />
        </section>
      )}

      <section
        id="penanganan"
        aria-labelledby="judul-penanganan"
        className={cn(KARTU, "gap-3.5", diPenanganan && "ring-2 ring-primary ring-offset-4 ring-offset-background")}
      >
        <h2 id="judul-penanganan" ref={refPenanganan} tabIndex={-1} className={cn(JUDUL_KARTU, "outline-none")}>
          Penanganan (risiko {LABEL_LEVEL[penanganan.level].toLowerCase()})
        </h2>
        <PenangananTabs
          idWilayah={data.idWilayah}
          penanganan={penanganan}
          tab={diPenanganan ? s.tab : tabLokal}
          onPilihTab={(tab) => (diPenanganan ? kirim({ type: "PILIH_TAB", tab }) : setTabLokal(tab))}
        />
      </section>

      <section id="kontak-darurat" aria-labelledby="judul-kontak" className={cn(KARTU, "gap-3")}>
        <h2 id="judul-kontak" className={JUDUL_KARTU}>
          Kontak darurat
        </h2>
        <Link
          href={`/kontak?wilayah=${data.idWilayah}`}
          className="flex min-h-[72px] items-center gap-3 rounded-[14px] bg-darurat px-4 py-3 text-darurat-foreground hover:opacity-95"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-darurat">
            <Phone className="size-[22px]" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[17px] font-extrabold">Lihat nomor darurat</span>
            <span className="text-[13px] font-semibold">Untuk {data.namaWilayah}</span>
          </span>
          <ChevronRight className="ml-auto size-[22px] shrink-0" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </section>
    </>
  );
}
