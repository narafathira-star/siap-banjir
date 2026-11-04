"use client";

import { useEffect, useId, useState } from "react";

type Item = { idPersiapan: string; isiPersiapan: string };

/** Checklist persiapan dini; progres disimpan di localStorage per wilayah + level. */
export function ChecklistPersiapan({ items, kunci }: { items: Item[]; kunci: string }) {
  const kunciStorage = `siapbanjir_checklist:${kunci}`;
  const [dicentang, setDicentang] = useState<Set<string>>(new Set());
  const idDasar = useId();

  useEffect(() => {
    try {
      const tersimpan: unknown = JSON.parse(window.localStorage.getItem(kunciStorage) ?? "[]");
      if (Array.isArray(tersimpan)) {
        setDicentang(new Set(tersimpan.filter((v): v is string => typeof v === "string")));
      }
    } catch {
      // localStorage tidak tersedia atau isinya rusak: mulai dari kosong.
    }
  }, [kunciStorage]);

  function ubah(id: string, centang: boolean) {
    setDicentang((lama) => {
      const baru = new Set(lama);
      if (centang) baru.add(id);
      else baru.delete(id);
      try {
        window.localStorage.setItem(kunciStorage, JSON.stringify([...baru]));
      } catch {
        // abaikan; progres hanya tidak tersimpan
      }
      return baru;
    });
  }

  if (items.length === 0) return <p className="text-[15px] text-muted-foreground">Belum ada daftar persiapan.</p>;

  const selesai = items.filter((i) => dicentang.has(i.idPersiapan)).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px] font-bold text-[#2d3748]">
          <span>Progres persiapan</span>
          <span className="tabular-nums">
            {selesai}/{items.length}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[#e4e9f0]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={selesai}
          aria-label="Progres persiapan"
        >
          <div className="h-full rounded-full bg-risk-rendah transition-all" style={{ width: `${(selesai / items.length) * 100}%` }} />
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const id = `${idDasar}-${item.idPersiapan}`;
          return (
            <li key={item.idPersiapan}>
              <label
                htmlFor={id}
                className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 text-[15px] leading-[1.45] text-[#1f2937] hover:bg-[#f7f9fc]"
              >
                <input
                  type="checkbox"
                  id={id}
                  checked={dicentang.has(item.idPersiapan)}
                  onChange={(e) => ubah(item.idPersiapan, e.target.checked)}
                  className="m-0 size-[22px] shrink-0 accent-risk-rendah"
                />
                <span>{item.isiPersiapan}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
