import type { TingkatRisiko } from "@prisma/client";
import { teksCatatanLokasi } from "@/components/cuaca/catatan-lokasi";
import { formatJamZona } from "@/lib/format";
import type { RisikoKlien } from "@/lib/tipe-risiko";
import { zonaWilayah } from "@/lib/zona-waktu";
import { cn } from "@/lib/utils";
import { GAYA_LEVEL } from "./gaya-level";

const WARNA_SEGMEN: Record<TingkatRisiko, string> = {
  RENDAH: "bg-risk-rendah rounded-l-full",
  SEDANG: "bg-risk-sedang",
  TINGGI: "bg-risk-tinggi rounded-r-full",
};

/** Bilah skor 0–100; tiga segmen sama lebar = rentang skor per level di risk.service (0–33, 34–66, 67–100). */
function BilahSkor({ skor, level }: { skor: number; level: TingkatRisiko }) {
  const s = Math.min(Math.max(skor, 0), 100);
  return (
    <div role="img" aria-label={`Skor risiko ${s} dari 100, ${GAYA_LEVEL[level].label}`} className="flex flex-col gap-1.5">
      <div className="flex justify-between text-[13px] font-bold text-[#1f2937]">
        <span>Skor risiko</span>
        <span className="tabular-nums">{s} / 100</span>
      </div>
      <div className="relative h-[22px]">
        <div className="absolute inset-x-0 top-[7px] grid h-2.5 grid-cols-3 gap-[3px]">
          {(Object.keys(WARNA_SEGMEN) as TingkatRisiko[]).map((l) => (
            <div key={l} className={WARNA_SEGMEN[l]} />
          ))}
        </div>
        <div
          className="absolute top-0 -ml-[3px] h-[22px] w-1.5 rounded-[3px] border border-white bg-foreground"
          style={{ left: `clamp(3px, ${s}%, calc(100% - 3px))` }}
        />
      </div>
      <div className="grid grid-cols-3 text-[12px] font-semibold text-[#2d3748]">
        <span>Rendah</span>
        <span className="text-center">Sedang</span>
        <span className="text-right">Tinggi</span>
      </div>
    </div>
  );
}

/** Kartu level di halaman Risiko: badge, deskripsi dari mesin risiko, pesan tindakan, skor, waktu data. */
export function KartuLevelRisiko({ data }: { data: RisikoKlien }) {
  const gaya = GAYA_LEVEL[data.level];
  const Ikon = gaya.ikon;
  return (
    <section aria-labelledby="judul-level" className={cn("flex flex-col gap-3.5 rounded-[22px] border-2 px-4 py-[18px]", gaya.lembut)}>
      <p className={cn("inline-flex items-center gap-2 self-start rounded-full py-2 pr-4 pl-3 text-[20px] font-extrabold", gaya.solid)}>
        <Ikon className="size-6" strokeWidth={2.4} aria-hidden="true" />
        {gaya.label}
      </p>
      {data.simulasi && (
        <p className="rounded-lg border border-foreground/20 bg-card px-3 py-2 text-[13px] font-bold">
          SIMULASI: level ini hasil uji coba, bukan kondisi cuaca sebenarnya.
        </p>
      )}
      <h2 id="judul-level" className="text-[18px] leading-[1.35] font-extrabold text-pretty">
        {data.deskripsi}
      </h2>
      <p className="text-[15px] leading-normal text-pretty text-[#1f2937]">{gaya.pesan}</p>
      <BilahSkor skor={data.skorRisiko} level={data.level} />
      <p className="text-[13px] leading-normal text-[#2d3748]">
        Diperbarui {formatJamZona(new Date(data.waktuAmbilData), zonaWilayah(data.idWilayah))} · {teksCatatanLokasi(data.koordinatPerkiraan)}
      </p>
    </section>
  );
}
