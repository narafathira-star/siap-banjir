import type { CuacaTerkini } from "@/lib/ambil-data-wilayah";
import { OPEN_METEO_ATTRIBUTION } from "@/lib/constants";
import { formatAngka, formatJamZona } from "@/lib/format";
import { infoKondisiCuaca } from "@/lib/weather-code";
import type { ZonaWaktu } from "@/lib/zona-waktu";
import { teksCatatanLokasi } from "./catatan-lokasi";

/** Cuaca terkini di halaman Cuaca (board Cuaca): suhu, kondisi, tiga ubin detail, waktu data & atribusi. */
export function KartuCuaca({
  dataCuaca,
  waktuAmbil,
  zona,
  koordinatPerkiraan,
}: {
  dataCuaca: CuacaTerkini;
  waktuAmbil: Date;
  zona: ZonaWaktu;
  koordinatPerkiraan: boolean;
}) {
  const kondisi = infoKondisiCuaca(dataCuaca.kondisiCuaca);
  const Ikon = kondisi.ikon;
  const detail = [
    { label: "Kelembapan", nilai: `${formatAngka(dataCuaca.kelembapan, 0)}%` },
    { label: "Angin", nilai: `${formatAngka(dataCuaca.kecepatanAngin)} km/j` },
    { label: "Hujan 15 mnt", nilai: `${formatAngka(dataCuaca.curahHujan)} mm` },
  ];

  return (
    <section aria-labelledby="judul-kini" className="flex flex-col gap-3.5 rounded-[20px] border bg-card p-4 text-card-foreground">
      <h2 id="judul-kini" className="text-[14px] font-bold text-[#3e4a5c]">
        Cuaca terkini
      </h2>
      <div className="flex items-center gap-3.5">
        <Ikon className="size-[60px] shrink-0 text-primary" strokeWidth={1.6} aria-hidden="true" />
        <div className="flex flex-col">
          <span className="text-[42px] leading-[1.05] font-extrabold tracking-[-0.03em] tabular-nums">
            {formatAngka(dataCuaca.suhu)}°C
          </span>
          <span className="text-[16px] font-semibold text-[#1f2937]">{kondisi.label}</span>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {detail.map(({ label, nilai }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 rounded-xl bg-background px-2 py-2.5 text-center">
            <dt className="text-[12px] font-semibold text-[#3e4a5c]">{label}</dt>
            <dd className="text-[17px] font-extrabold tabular-nums">{nilai}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[13px] leading-normal text-[#3e4a5c]">
        Diperbarui {formatJamZona(waktuAmbil, zona)} · {teksCatatanLokasi(koordinatPerkiraan)}{" "}
        <a href={OPEN_METEO_ATTRIBUTION.url} className="text-primary hover:text-primary-hover">
          Open-Meteo.com
        </a>{" "}
        ({OPEN_METEO_ATTRIBUTION.licenseLabel})
      </p>
    </section>
  );
}
