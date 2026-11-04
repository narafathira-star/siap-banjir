import { BookOpen, CloudRain, House, ShieldAlert, SlidersHorizontal, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: House },
  { href: "/risiko", label: "Risiko", icon: ShieldAlert },
  { href: "/cuaca", label: "Cuaca", icon: CloudRain },
  { href: "/informasi", label: "Informasi", icon: BookOpen },
  { href: "/pengaturan", label: "Pengaturan", icon: SlidersHorizontal },
];

export function isNavActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
