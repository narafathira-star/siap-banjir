import Link from "next/link";
import type { TingkatRisiko } from "@prisma/client";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { infoKondisiCuaca } from "@/lib/weather-code";

/** Kelas bersama kartu kecil Beranda (putih, garis tipis, sudut 18px). */
export const KARTU_KECIL =
  "flex min-h-[148px] flex-col gap-1.5 rounded-[18px] border bg-card p-3.5 text-left text-card-foreground no-underline";

const WARNA_HUJAN: Record<TingkatRisiko, string> = {
  RENDAH: "text-[#1f2937]",
  SEDANG: "text-risk-sedang-teks",
  TINGGI: "text-risk-tinggi-teks",
};

/** Wilayah yang sedang dipantau; ganti wilayah di Pengaturan. */
export function WilayahDipantau({ nama }: { nama: string }) {
  return (
    <Link
      href="/pengaturan"
      className="flex min-h-14 items-center gap-2.5 rounded-2xl border bg-card px-3.5 py-2 text-card-foreground"
    >
      <MapPin className="size-[22px] shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
      <span className="flex min-w-0 flex-col gap-px">
        <span className="text-[12px] font-semibold text-muted-foreground">Wilayah yang dipantau</span>
        <span className="text-[15px] font-bold">{nama}</span>
      </span>
      <span className="ml-auto text-[14px] font-bold text-primary">
        Ubah<span className="sr-only"> wilayah</span>
      </span>
    </Link>
  );
}

/** Ringkasan cuaca: suhu, kondisi, dan hujan 24 jam terakhir (nilai yang dipakai mesin risiko). */
export function KartuCuacaRingkas({
  suhu,
  kodeCuaca,
  hujan24Jam,
}: {
  suhu: number;
  kodeCuaca: number;
  hujan24Jam: { teks: string; level: TingkatRisiko } | null;
}) {
  const kondisi = infoKondisiCuaca(kodeCuaca);
  const Ikon = kondisi.ikon;
  return (
    <Link href="/cuaca" className={KARTU_KECIL}>
      <span className="text-[13px] font-bold text-[#3e4a5c]">Cuaca terkini</span>
      <Ikon className="size-[34px] text-primary" strokeWidth={1.8} aria-hidden="true" />
      <span className="text-[26px] font-extrabold tracking-[-0.02em] tabular-nums">{formatAngka(suhu)}°C</span>
      <span className="text-[14px] font-semibold text-[#2d3748]">{kondisi.label}</span>
      {hujan24Jam && (
        <span className={cn("text-[13px] font-bold", WARNA_HUJAN[hujan24Jam.level])}>Hujan 24 jam: {hujan24Jam.teks}</span>
      )}
    </Link>
  );
}

/** Pintasan kontak darurat; merah penuh saat risiko tinggi. */
export function TautanKontakDarurat({ href, tinggi }: { href: string; tinggi: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-h-[72px] items-center gap-3 rounded-[18px] border-2 border-darurat px-4 py-3",
        tinggi ? "bg-darurat text-darurat-foreground" : "bg-card text-darurat-teks",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-darurat",
          tinggi ? "bg-white" : "bg-darurat-lembut",
        )}
      >
        <Phone className="size-[22px]" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[16px] font-extrabold">Kontak darurat</span>
        <span className="text-[13px] font-semibold">Untuk wilayah yang dipantau</span>
      </span>
      <ChevronRight className="ml-auto size-[22px]" strokeWidth={2.2} aria-hidden="true" />
    </Link>
  );
}
