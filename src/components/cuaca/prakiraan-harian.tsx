import { formatAngka, formatTanggalLokal } from "@/lib/format";
import { kategoriHujanHarian } from "@/lib/weather-code";
import type { RingkasanHarian } from "@/server/services/seri-cuaca";

/** Satu kartu per hari (board Cuaca): kategori hujan BMKG, curah hujan, peluang maks, rentang suhu. */
export function PrakiraanHarian({ harian }: { harian: RingkasanHarian[] }) {
  return (
    <section aria-labelledby="judul-harian" className="flex flex-col gap-2.5">
      <h2 id="judul-harian" className="text-[18px] font-extrabold">
        Prakiraan harian
      </h2>
      <ul className="flex flex-col gap-2.5">
        {harian.map((h, i) => {
          const detail = [
            { label: "Curah hujan", nilai: h.hujan != null ? `${formatAngka(h.hujan)} mm` : "–" },
            { label: "Peluang hujan", nilai: h.peluangMaks != null ? `${h.peluangMaks}%` : "–" },
            {
              label: "Suhu",
              nilai: h.suhuMin != null && h.suhuMaks != null ? `${formatAngka(h.suhuMin)}–${formatAngka(h.suhuMaks)}°C` : "–",
            },
          ];
          return (
            <li key={h.tanggal} className="flex flex-col gap-2.5 rounded-2xl border bg-card px-4 py-3.5 text-card-foreground">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[16px] font-extrabold">{i === 0 ? "Hari ini" : formatTanggalLokal(h.tanggal)}</h3>
                <span className="text-[14px] font-semibold text-primary">{h.hujan != null ? kategoriHujanHarian(h.hujan) : "–"}</span>
              </div>
              <dl className="grid grid-cols-3 gap-2">
                {detail.map(({ label, nilai }) => (
                  <div key={label} className="flex flex-col gap-px">
                    <dt className="text-[12px] text-[#3e4a5c]">{label}</dt>
                    <dd className="text-[15px] font-extrabold tabular-nums">{nilai}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
