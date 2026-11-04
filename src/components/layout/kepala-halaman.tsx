import Link from "next/link";
import { MapPin } from "lucide-react";

/** Judul halaman + subjudul + baris wilayah dengan tautan "Ubah" ke Pengaturan (board Risiko & Cuaca). */
export function KepalaHalaman({
  judul,
  subjudul,
  namaWilayah,
}: {
  judul: string;
  subjudul: string;
  namaWilayah?: string | null;
}) {
  return (
    <header className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-[1.2] font-extrabold tracking-[-0.02em]">{judul}</h1>
        <p className="text-[15px] leading-[1.45] text-[#3e4a5c]">{subjudul}</p>
      </div>
      {namaWilayah ? (
        <p className="flex items-center gap-2.5">
          <MapPin className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
          <span className="text-[15px] font-bold">{namaWilayah}</span>
          <Link
            href="/pengaturan"
            className="ml-auto inline-flex min-h-11 shrink-0 items-center text-[14px] font-bold text-primary hover:text-primary-hover"
          >
            Ubah<span className="sr-only"> wilayah</span>
          </Link>
        </p>
      ) : null}
    </header>
  );
}
