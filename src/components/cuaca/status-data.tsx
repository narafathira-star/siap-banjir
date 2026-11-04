import { CloudOff } from "lucide-react";
import { formatJamZona } from "@/lib/format";
import type { SumberData } from "@/lib/tipe-risiko";
import type { ZonaWaktu } from "@/lib/zona-waktu";

/** Peringatan data lama: jika API gagal atau kuota menipis, beri tahu bahwa ini data terakhir yang tersimpan. */
export function StatusData({ sumber, waktuAmbil, zona }: { sumber: SumberData; waktuAmbil: Date; zona: ZonaWaktu }) {
  const jam = formatJamZona(waktuAmbil, zona);
  if (sumber === "cadangan" || sumber === "hemat-kuota") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
      >
        <CloudOff className="size-4 shrink-0" aria-hidden="true" />
        {sumber === "cadangan"
          ? "Open-Meteo sedang tidak dapat dihubungi."
          : "Batas harian permintaan data cuaca hampir tercapai."}{" "}
        Data terakhir diperbarui pukul {jam}.
      </p>
    );
  }
  // Data segar: jam pembaruan sudah tampil di kartu masing-masing halaman (D-055).
  return null;
}
