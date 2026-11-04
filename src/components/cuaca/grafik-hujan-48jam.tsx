"use client";

import { useEffect } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ZonaWaktu } from "@/lib/zona-waktu";
import type { TitikGrafikJam } from "@/server/services/seri-cuaca";

const formatSumbuX = (waktu: string) => (waktu.endsWith("T00:00") ? waktu.slice(8, 10) + "/" + waktu.slice(5, 7) : waktu.slice(11, 16));

/** Curah hujan per jam: 24 jam lalu (pengamatan) + 24 jam ke depan (prakiraan). Waktu `data` dalam zona wilayah (D-060). */
export function GrafikHujan48Jam({
  data,
  zona,
  onSelesaiRender,
}: {
  data: TitikGrafikJam[];
  zona: ZonaWaktu;
  /** Dipanggil setelah grafik tergambar di layar (state machine: SelesaiRender). */
  onSelesaiRender?: () => void;
}) {
  // Dua frame: ResponsiveContainer mengukur di frame pertama, SVG tergambar di frame kedua.
  useEffect(() => {
    if (!onSelesaiRender) return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(onSelesaiRender);
    });
    return () => cancelAnimationFrame(id);
  }, [onSelesaiRender, data]);

  const sekarang = [...data].reverse().find((d) => d.lalu)?.waktu;
  const total = (lalu: boolean) =>
    data.filter((d) => d.lalu === lalu).reduce((s, d) => s + (d.hujan ?? 0), 0).toLocaleString("id-ID", { maximumFractionDigits: 1 });

  return (
    <figure className="space-y-2">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="waktu" tickFormatter={formatSumbuX} interval={5} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} unit=" mm" width={60} />
            <Tooltip
              labelFormatter={(w) => `${String(w).slice(8, 10)}/${String(w).slice(5, 7)} ${String(w).slice(11, 16)} ${zona.singkatan}`}
              formatter={(v) => [`${v ?? "-"} mm`, "Curah hujan"]}
            />
            {sekarang ? (
              <ReferenceLine x={sekarang} stroke="currentColor" strokeDasharray="4 4" label={{ value: "Sekarang", position: "top", fontSize: 12 }} />
            ) : null}
            <Bar dataKey="hujan" radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.waktu} fill="var(--primary)" fillOpacity={d.lalu ? 0.45 : 1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-primary/45" aria-hidden="true" />
          24 jam lalu: {total(true)} mm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-primary" aria-hidden="true" />
          Prakiraan 24 jam: {total(false)} mm
        </span>
      </figcaption>
    </figure>
  );
}
