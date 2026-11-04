import { Check } from "lucide-react";
import { LABEL_LEVEL, PARAMETER_RISIKO, formatNilaiParameter } from "@/lib/risiko";
import { cn } from "@/lib/utils";
import type { HasilParameter } from "@/server/validators/risiko";
import { GAYA_LEVEL } from "./gaya-level";

/** Nilai tiap parameter dan level yang dicapainya; parameter pemicu ditandai. */
export function DaftarParameter({ hasil }: { hasil: HasilParameter[] }) {
  if (hasil.length === 0) {
    return <p className="text-[15px] text-muted-foreground">Data parameter belum tersedia.</p>;
  }
  return (
    <ul>
      {hasil.map((h) => {
        const gaya = GAYA_LEVEL[h.level];
        const Ikon = h.level === "RENDAH" ? Check : gaya.ikon;
        return (
          <li
            key={h.parameter}
            className="flex min-h-[68px] items-center justify-between gap-3 border-t border-[#e4e9f0] py-2.5"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] text-[#3e4a5c]">
                {PARAMETER_RISIKO[h.parameter].label}
                {h.pemicu && h.level !== "RENDAH" ? (
                  <span className="ml-2 rounded bg-foreground px-1.5 py-0.5 text-[12px] font-bold text-background">
                    Pemicu
                  </span>
                ) : null}
              </span>
              <span className="text-[22px] font-extrabold tracking-[-0.01em] tabular-nums">
                {formatNilaiParameter(h.parameter, h.nilai)}
              </span>
              {h.ambangKhusus ? <span className="text-[12px] text-muted-foreground">Memakai ambang khusus wilayah</span> : null}
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-[5px] rounded-full px-2.5 py-[5px] text-[13px] font-bold",
                gaya.solid,
              )}
            >
              <Ikon className="size-3.5" strokeWidth={2.6} aria-hidden="true" />
              {LABEL_LEVEL[h.level]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
