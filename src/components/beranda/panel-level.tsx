import type { ReactNode } from "react";
import Link from "next/link";
import type { TingkatRisiko } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { GAYA_LEVEL } from "@/components/risiko/gaya-level";
import { LABEL_LEVEL } from "@/lib/risiko";
import { cn } from "@/lib/utils";
import { IlustrasiAir } from "./ilustrasi-air";

const URUTAN: TingkatRisiko[] = ["RENDAH", "SEDANG", "TINGGI"];

const WARNA_TITIK: Record<TingkatRisiko, string> = {
  RENDAH: "bg-risk-rendah",
  SEDANG: "bg-risk-sedang",
  TINGGI: "bg-risk-tinggi",
};
const GARIS_SOLID: Record<TingkatRisiko, string> = {
  RENDAH: "border-risk-rendah",
  SEDANG: "border-risk-sedang",
  TINGGI: "border-risk-tinggi",
};

/** Skala tiga level; level saat ini diisi warna solid dan diberi teks "Saat ini" (bukan warna saja). */
function SkalaLevel({ level }: { level: TingkatRisiko }) {
  return (
    <ol aria-label="Skala level risiko" className="grid grid-cols-3 gap-1.5">
      {URUTAN.map((l) => {
        const kini = l === level;
        return (
          <li
            key={l}
            aria-current={kini ? "step" : undefined}
            className={cn(
              "flex min-h-[54px] flex-col items-center justify-center gap-px rounded-xl border-2 px-1.5 py-[7px]",
              GARIS_SOLID[l],
              kini ? GAYA_LEVEL[l].solid : "bg-card text-[#1f2937]",
            )}
          >
            <span className={cn("inline-flex items-center gap-1.5 text-[14px]", kini ? "font-extrabold" : "font-semibold")}>
              <span className={cn("size-2.5 rounded-full", kini ? "bg-current" : WARNA_TITIK[l])} aria-hidden="true" />
              {LABEL_LEVEL[l]}
            </span>
            <span className="min-h-[15px] text-[11px] font-bold">{kini ? "Saat ini" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Kartu utama Beranda: level risiko, ilustrasi air, skala, deskripsi dari mesin risiko, dan ajakan. */
export function PanelLevel({
  level,
  deskripsi,
  simulasi,
  idWilayah,
  tombolPerbarui,
}: {
  level: TingkatRisiko;
  deskripsi: string;
  simulasi: boolean;
  idWilayah: string;
  /** Jam pembaruan yang sekaligus tombol Perbarui (D-055). */
  tombolPerbarui: ReactNode;
}) {
  const gaya = GAYA_LEVEL[level];
  const Ikon = gaya.ikon;
  return (
    <section aria-labelledby="judul-level" className={cn("flex flex-col gap-3.5 rounded-3xl border-2 p-4", gaya.lembut)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn("inline-flex items-center gap-2 rounded-full py-2 pr-4 pl-3 text-[18px] font-extrabold", gaya.solid)}>
          <Ikon className="size-[22px]" strokeWidth={2.4} aria-hidden="true" />
          {gaya.label}
        </p>
        {tombolPerbarui}
      </div>

      {simulasi && (
        <p className="rounded-lg border border-foreground/20 bg-card px-3 py-2 text-[13px] font-bold">
          SIMULASI: level ini hasil uji coba, bukan kondisi cuaca sebenarnya.
        </p>
      )}

      <IlustrasiAir level={level} />
      <p className="-mt-1.5 text-center text-[12px] font-medium text-[#3e4a5c]">
        Ilustrasi level risiko, bukan ketinggian air sebenarnya.
      </p>

      <SkalaLevel level={level} />

      <h2 id="judul-level" className="text-[20px] leading-[1.3] font-extrabold text-pretty">
        {deskripsi}
      </h2>
      <p className="text-[15px] leading-normal text-pretty text-[#1f2937]">{gaya.ringkasan}</p>
      <Link
        href={`/risiko?wilayah=${idWilayah}`}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-primary px-[18px] text-[16px] font-bold text-primary-foreground hover:bg-primary-hover"
      >
        {gaya.ajakan}
        <ArrowRight className="size-5" strokeWidth={2.2} aria-hidden="true" />
      </Link>
    </section>
  );
}
