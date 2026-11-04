"use client";

import { LoaderCircle, RefreshCw } from "lucide-react";

/** `teks`: hasil cek tombol, mis. "Sudah dicek 01:46 · data terbaru dari 01:33 WIT." (D-057, D-060). */
export type HasilPerbarui = { status: "selesai"; teks: string } | { status: "galat"; pesan: string } | null;

/**
 * Jam pembaruan di kartu level Beranda yang sekaligus tombol "Perbarui" (D-055).
 * State & pengambilan data ada di `RingkasanBeranda`.
 */
export function TombolPerbaruiData({
  jam,
  memuat,
  hasil,
  onPerbarui,
}: {
  /** "19:00 WITA" (jam + zona wilayah, D-060) */
  jam: string;
  memuat: boolean;
  hasil: HasilPerbarui;
  onPerbarui: () => void;
}) {
  // Saat memuat hanya untuk pembaca layar (spinner = indikator visual); hasil cek tampil untuk semua.
  const pengumuman = memuat ? "Memperbarui data…" : hasil?.status === "selesai" ? hasil.teks : "";

  return (
    <>
      {/* aria-disabled (bukan disabled) agar fokus keyboard tidak hilang selama memuat. */}
      <button
        type="button"
        onClick={() => {
          if (!memuat) onPerbarui();
        }}
        aria-disabled={memuat}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#c6cfdc] bg-card px-3 text-[13px] font-semibold text-[#2d3748] transition-colors hover:bg-[#f7f9fc] aria-disabled:cursor-progress"
      >
        {memuat ? (
          <LoaderCircle className="size-3.5 motion-safe:animate-spin" strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <RefreshCw className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
        )}
        {/* Jam tetap terlihat saat memuat (lebar tombol tidak berubah); spinner = indikator visual. */}
        <span className="sr-only">
          {memuat ? "Memperbarui data. Terakhir diperbarui pukul" : "Perbarui data. Terakhir diperbarui pukul"}
        </span>
        {jam}
      </button>
      <p
        role="status"
        className={hasil?.status === "selesai" ? "basis-full text-[13px] leading-snug text-[#3e4a5c]" : "sr-only"}
      >
        {pengumuman}
      </p>
      {hasil?.status === "galat" ? (
        <p role="alert" className="basis-full text-[14px] text-destructive">
          Gagal memperbarui: {hasil.pesan}. Menampilkan data terakhir.
        </p>
      ) : null}
    </>
  );
}
