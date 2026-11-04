"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LogoMark } from "./logo";
import { NAV_ITEMS, isNavActive } from "./nav-items";

/** Tujuan tombol Darurat: halaman Nomor Darurat (D-050). */
export const HREF_DARURAT = "/kontak";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85",
        // Board Nomor Darurat tanpa header di HP (ada tombol Kembali); di desktop header = satu-satunya navigasi.
        pathname === HREF_DARURAT && "max-md:hidden",
      )}
    >
      <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
        <Link href="/" className="flex items-center gap-2 rounded-md text-[19px] font-extrabold tracking-[-0.01em]">
          <LogoMark />
          <span>{APP_NAME}</span>
        </Link>

        {/* Navigasi desktop; di layar kecil diganti BottomNav. */}
        <nav aria-label="Navigasi utama" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isNavActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3 py-2 text-[15px] transition-colors hover:bg-primary-lembut",
                      active ? "bg-primary-lembut font-extrabold text-primary" : "font-semibold text-[#3e4a5c]",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Link
          href={HREF_DARURAT}
          aria-current={pathname === HREF_DARURAT ? "page" : undefined}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-darurat px-4 text-[15px] font-extrabold text-darurat-foreground hover:opacity-90"
        >
          <Phone className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
          Darurat
        </Link>
      </div>
    </header>
  );
}
