"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Kembali ke halaman sebelumnya; dibuka langsung (tanpa riwayat) → ke Beranda. */
export function TautanKembali() {
  const router = useRouter();
  return (
    <Link
      href="/"
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="-ml-1.5 inline-flex min-h-11 items-center gap-1.5 self-start px-1.5 text-[15px] font-bold text-primary hover:text-primary-hover"
    >
      <ArrowLeft className="size-5" strokeWidth={2.2} aria-hidden="true" />
      Kembali
    </Link>
  );
}
