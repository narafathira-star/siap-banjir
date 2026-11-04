import type { ZonaWaktu } from "@/lib/zona-waktu";

// Zona wajib diisi: jam dan tanggal selalu mengikuti zona wilayah terpilih (D-060).

function bagian(date: Date, zona: ZonaWaktu, opsi: Intl.DateTimeFormatOptions) {
  const parts = new Intl.DateTimeFormat("id-ID", { timeZone: zona.iana, ...opsi }).formatToParts(date);
  return (tipe: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === tipe)?.value ?? "";
}

/** "13:05" di zona `zona`. */
export function formatJam(date: Date, zona: ZonaWaktu) {
  const ambil = bagian(date, zona, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${ambil("hour")}:${ambil("minute")}`;
}

/** "13:05 WITA". */
export function formatJamZona(date: Date, zona: ZonaWaktu) {
  return `${formatJam(date, zona)} ${zona.singkatan}`;
}

/** "Kamis, 25 September 2026" di zona `zona`. */
export function formatTanggalPanjang(date: Date, zona: ZonaWaktu) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: zona.iana,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "25 Sep 2026" di zona `zona`. */
export function formatTanggal(date: Date, zona: ZonaWaktu) {
  return new Intl.DateTimeFormat("id-ID", { timeZone: zona.iana, day: "numeric", month: "short", year: "numeric" }).format(
    date,
  );
}

/** Tanggal lokal "2026-09-25" dari Open-Meteo → "Kam, 25 Sep". */
export function formatTanggalLokal(tanggal: string) {
  const [y, m, d] = tanggal.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(
    date,
  );
}

/** Tanggal "2026-09-27" (tanpa jam/zona) → "27 September 2026". */
export function formatTanggalLokalPanjang(tanggal: string) {
  const [y, m, d] = tanggal.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function formatAngka(n: number, digit = 1) {
  return n.toLocaleString("id-ID", { maximumFractionDigits: digit });
}
