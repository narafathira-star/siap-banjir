"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatAngka, formatTanggalLokal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ZonaWaktu } from "@/lib/zona-waktu";
import type { SeriHarian, TitikGrafikJam } from "@/server/services/seri-cuaca";

/** Warna mengikuti board: biru utama, garis bantu #E4E9F0, teks sekunder #3E4A5C. */
const WARNA = {
  hujan: "var(--primary)",
  suhu: "var(--risk-tinggi)",
  peluang: "#3e4a5c",
  grid: "#e4e9f0",
  sumbu: "#0e1726",
  teks: "#3e4a5c",
};
const NAMA_HARI = ["Hari ini", "Besok", "Lusa"];
const TICK = { fontSize: 11, fill: WARNA.teks, fontWeight: 600 };

const labelHari = (i: number, tanggal: string) => NAMA_HARI[i] ?? formatTanggalLokal(tanggal);
const nilai = (n: number | null, satuan: string) => (n == null ? "–" : `${formatAngka(n)}${satuan}`);

function IsiTooltip({ active, payload, zona }: TooltipContentProps<ValueType, NameType> & { zona: ZonaWaktu }) {
  const t = payload?.[0]?.payload as TitikGrafikJam | undefined;
  if (!active || !t) return null;
  return (
    <div className="rounded-xl border bg-card px-3 py-2 text-[13px] leading-snug text-card-foreground shadow-md">
      <p className="font-extrabold">
        Pukul {t.jam} {zona.singkatan}
        {t.lalu ? " (sudah lewat)" : ""}
      </p>
      <p>
        Hujan: <b>{nilai(t.hujan, " mm")}</b>
      </p>
      <p>
        Peluang hujan: <b>{nilai(t.peluang, "%")}</b>
      </p>
      <p>
        Suhu: <b>{nilai(t.suhu, "°C")}</b>
      </p>
    </div>
  );
}

/**
 * Prakiraan per jam untuk satu hari (D-052): batang = curah hujan (mm), garis = suhu (°C) dan
 * peluang hujan (%). Pilihan hari berupa tab; nilai tiap jam muncul saat batang disentuh/diarahkan.
 * Jam dan tanggal `hari` sudah dalam zona wilayah (D-060); `zona` untuk labelnya.
 */
export function GrafikPrakiraanJam({ hari, zona }: { hari: SeriHarian[]; zona: ZonaWaktu }) {
  const [aktif, setAktif] = useState(0);
  const tabRef = useRef<(HTMLButtonElement | null)[]>([]);
  const seri = hari[aktif];
  if (!seri) return null;

  // Skala hujan sama untuk semua hari, supaya batang antarhari bisa dibandingkan.
  const maksHujan = Math.max(1, ...hari.flatMap((h) => h.titik.map((t) => t.hujan ?? 0)));
  const sekarang = [...seri.titik].reverse().find((t) => t.lalu)?.waktu;
  const adaLalu = seri.titik.some((t) => t.lalu);
  const ticks = seri.titik.filter((t) => Number(t.jam.slice(0, 2)) % 3 === 0).map((t) => t.waktu);

  function pindah(e: KeyboardEvent, i: number) {
    const arah = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!arah) return;
    e.preventDefault();
    const baru = (i + arah + hari.length) % hari.length;
    setAktif(baru);
    tabRef.current[baru]?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Pilih hari" className="grid grid-cols-3 gap-1 rounded-[14px] bg-[#eef1f6] p-1">
        {hari.map((h, i) => (
          <button
            key={h.tanggal}
            ref={(el) => {
              tabRef.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-hari-${i}`}
            aria-selected={aktif === i}
            aria-controls="panel-hari"
            tabIndex={aktif === i ? 0 : -1}
            onClick={() => setAktif(i)}
            onKeyDown={(e) => pindah(e, i)}
            className={cn(
              "flex min-h-11 flex-col items-center justify-center rounded-[11px] px-1 py-1 leading-tight transition-colors",
              aktif === i
                ? "bg-card text-foreground shadow-[0_1px_3px_rgba(14,23,38,0.18)]"
                : "text-[#3e4a5c] hover:text-foreground",
            )}
          >
            <span className="text-[14px] font-bold">{labelHari(i, h.tanggal)}</span>
            <span className="text-[11px] font-semibold">{formatTanggalLokal(h.tanggal)}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id="panel-hari" aria-labelledby={`tab-hari-${aktif}`} className="flex flex-col gap-2">
        <div className="h-64 w-full" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={seri.titik}
              margin={{ top: 18, right: 0, bottom: 0, left: 0 }}
              barCategoryGap="15%"
              accessibilityLayer={false}
            >
              <CartesianGrid vertical={false} stroke={WARNA.grid} />
              <XAxis
                dataKey="waktu"
                ticks={ticks}
                tickFormatter={(w: string) => w.slice(11, 13)}
                tick={TICK}
                tickLine={false}
                axisLine={{ stroke: WARNA.sumbu, strokeWidth: 2 }}
                interval={0}
              />
              <YAxis
                yAxisId="mm"
                domain={[0, Math.ceil(maksHujan)]}
                allowDecimals={false}
                tick={TICK}
                tickLine={false}
                axisLine={false}
                width={26}
              />
              <YAxis
                yAxisId="kanan"
                orientation="right"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={TICK}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={(p) => <IsiTooltip {...p} zona={zona} />} cursor={{ fill: "rgba(23,66,201,0.08)" }} />
              {sekarang ? (
                <ReferenceLine
                  yAxisId="mm"
                  x={sekarang}
                  stroke={WARNA.sumbu}
                  strokeDasharray="4 3"
                  label={{
                    value: "Sekarang",
                    position: "top",
                    fontSize: 11,
                    fontWeight: 700,
                    fill: WARNA.sumbu,
                  }}
                />
              ) : null}
              <Bar yAxisId="mm" dataKey="hujan" name="Hujan" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {seri.titik.map((t) => (
                  <Cell key={t.waktu} fill={WARNA.hujan} fillOpacity={t.lalu ? 0.4 : 1} />
                ))}
              </Bar>
              <Line
                yAxisId="kanan"
                dataKey="peluang"
                name="Peluang hujan"
                stroke={WARNA.peluang}
                strokeDasharray="5 3"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="kanan"
                dataKey="suhu"
                name="Suhu"
                stroke={WARNA.suhu}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-semibold text-[#1f2937]">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3.5 w-2.5 rounded-t-[2px] bg-primary" aria-hidden="true" />
            Hujan (mm, sumbu kiri)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-dashed border-[#3e4a5c]" aria-hidden="true" />
            Peluang hujan (%, sumbu kanan)
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-4 border-t-2 border-risk-tinggi" aria-hidden="true" />
            Suhu (°C, sumbu kanan)
          </li>
        </ul>
        <p className="text-[13px] leading-normal text-[#3e4a5c]">
          Angka di bawah grafik = pukul ({zona.singkatan}). Sentuh batang untuk melihat nilai per jam.
          {adaLalu ? " Batang pudar = jam yang sudah lewat." : ""}
        </p>

        {/* Nilai lengkap untuk pembaca layar dan pengguna keyboard; grafik SVG di atas disembunyikan dari teknologi bantu. */}
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-[14px] font-bold text-primary hover:text-primary-hover">
            Lihat tabel per jam
          </summary>
          <table className="w-full text-left text-[13px] tabular-nums">
            <caption className="sr-only">
              Prakiraan per jam, {labelHari(aktif, seri.tanggal)} {formatTanggalLokal(seri.tanggal)}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="border-b py-1.5 font-bold">
                  Jam
                </th>
                <th scope="col" className="border-b py-1.5 font-bold">
                  Hujan
                </th>
                <th scope="col" className="border-b py-1.5 font-bold">
                  Peluang hujan
                </th>
                <th scope="col" className="border-b py-1.5 font-bold">
                  Suhu
                </th>
              </tr>
            </thead>
            <tbody>
              {seri.titik.map((t) => (
                <tr key={t.waktu} className={t.lalu ? "text-[#3e4a5c]" : undefined}>
                  <th scope="row" className="border-b py-1.5 font-semibold">
                    {t.jam}
                    {t.lalu ? " (sudah lewat)" : ""}
                  </th>
                  <td className="border-b py-1.5">{nilai(t.hujan, " mm")}</td>
                  <td className="border-b py-1.5">{nilai(t.peluang, "%")}</td>
                  <td className="border-b py-1.5">{nilai(t.suhu, "°C")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </div>
  );
}
