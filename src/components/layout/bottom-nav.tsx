"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "./nav-items";

/** Tab bar bawah untuk layar HP; menu aktif ditandai pil biru, teks tebal, dan aria-current. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex gap-0.5 px-2 pt-1.5 pb-2.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[60px] flex-col items-center justify-center gap-[3px] rounded-xl text-[11.5px]",
                  active ? "font-extrabold text-primary" : "font-semibold text-[#3e4a5c]",
                )}
              >
                <span
                  className={cn("flex h-[30px] w-[52px] items-center justify-center rounded-full", active && "bg-primary-lembut")}
                >
                  <Icon className="size-[22px]" strokeWidth={2} aria-hidden="true" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
