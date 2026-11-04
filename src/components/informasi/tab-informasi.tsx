"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabInformasiId = "umum" | "riwayat";

/**
 * Tab "Informasi umum" | "Riwayat kejadian" (board Informasi). Kedua panel dirender server;
 * tab aktif ditulis ke `?tab=` agar tombol Kembali dari artikel kembali ke tab yang sama.
 */
export function TabInformasi({
  awal,
  tab,
}: {
  awal: TabInformasiId;
  tab: Record<TabInformasiId, { label: string; jumlah: number; isi: ReactNode }>;
}) {
  const [aktif, setAktif] = useState<TabInformasiId>(awal);
  const ref = useRef<Partial<Record<TabInformasiId, HTMLButtonElement | null>>>({});
  const urutan: TabInformasiId[] = ["umum", "riwayat"];

  function pilih(id: TabInformasiId) {
    setAktif(id);
    const url = new URL(window.location.href);
    if (id === "umum") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  function pindah(e: KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const baru = urutan.find((id) => id !== aktif)!;
    pilih(baru);
    ref.current[baru]?.focus();
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Jenis informasi" className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#e3e8ef] p-1">
        {urutan.map((id) => (
          <button
            key={id}
            ref={(el) => {
              ref.current[id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={aktif === id}
            aria-controls={`panel-${id}`}
            tabIndex={aktif === id ? 0 : -1}
            onClick={() => pilih(id)}
            onKeyDown={pindah}
            className={cn(
              "min-h-[46px] rounded-[11px] px-2 text-[14px] font-bold transition-colors",
              aktif === id
                ? "bg-card text-foreground shadow-[0_1px_3px_rgba(14,23,38,0.18)]"
                : "text-[#3e4a5c] hover:text-foreground",
            )}
          >
            {tab[id].label} ({tab[id].jumlah})
          </button>
        ))}
      </div>
      {urutan.map((id) => (
        <div key={id} role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={aktif !== id}>
          {tab[id].isi}
        </div>
      ))}
    </div>
  );
}
