"use client";

import type { TabPenanganan } from "@/lib/mesin-risiko";
import type { PenangananKlien } from "@/lib/tipe-risiko";
import { cn } from "@/lib/utils";
import { ChecklistPersiapan } from "./checklist-persiapan";
import { DaftarRekomendasi } from "./daftar-rekomendasi";

const TAB: { id: TabPenanganan; label: string }[] = [
  { id: "checklist", label: "Checklist Siaga" },
  { id: "mitigasi", label: "Detail Mitigasi" },
];

/** Sub-state Detail Penanganan: Checklist Siaga (persiapan dini) | Detail Mitigasi (rekomendasi). */
export function PenangananTabs({
  idWilayah,
  penanganan,
  tab,
  onPilihTab,
}: {
  idWilayah: string;
  penanganan: PenangananKlien;
  tab: TabPenanganan;
  onPilihTab: (tab: TabPenanganan) => void;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div role="tablist" aria-label="Detail penanganan" className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#eef1f6] p-1">
        {TAB.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => onPilihTab(id)}
            className={cn(
              "min-h-11 rounded-[11px] px-2 text-[14px] font-bold transition-colors",
              tab === id
                ? "bg-card text-foreground shadow-[0_1px_3px_rgba(14,23,38,0.18)]"
                : "text-[#3e4a5c] hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "checklist" ? (
        <div role="tabpanel" id="panel-checklist" aria-labelledby="tab-checklist">
          <ChecklistPersiapan kunci={`${idWilayah}:${penanganan.level}`} items={penanganan.persiapan} />
        </div>
      ) : (
        <div role="tabpanel" id="panel-mitigasi" aria-labelledby="tab-mitigasi">
          <DaftarRekomendasi level={penanganan.level} items={penanganan.rekomendasi} />
        </div>
      )}
    </div>
  );
}
