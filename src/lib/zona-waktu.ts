/**
 * Zona waktu Indonesia per provinsi (D-060). Semua jam dan tanggal ditampilkan dalam zona wilayah terpilih.
 * Kode provinsi Kemendagri = dua digit pertama kode wilayah.
 */
export type ZonaWaktu = {
  iana: "Asia/Jakarta" | "Asia/Makassar" | "Asia/Jayapura";
  singkatan: "WIB" | "WITA" | "WIT";
  /** Selisih dari UTC dalam jam. */
  offsetJam: 7 | 8 | 9;
};

export const WIB: ZonaWaktu = { iana: "Asia/Jakarta", singkatan: "WIB", offsetJam: 7 };
export const WITA: ZonaWaktu = { iana: "Asia/Makassar", singkatan: "WITA", offsetJam: 8 };
export const WIT: ZonaWaktu = { iana: "Asia/Jayapura", singkatan: "WIT", offsetJam: 9 };

/** Bali, Nusa Tenggara, Kalimantan Selatan/Timur/Utara, seluruh Sulawesi. */
const PROVINSI_WITA = new Set(["51", "52", "53", "63", "64", "65", "71", "72", "73", "74", "75", "76"]);
/** Maluku, Maluku Utara, seluruh provinsi Papua. */
const PROVINSI_WIT = new Set(["81", "82", "91", "92", "93", "94", "95", "96"]);

/** Zona wilayah dari kode Kemendagri tingkat apa pun; tanpa wilayah → WIB. */
export function zonaWilayah(idWilayah: string | null | undefined): ZonaWaktu {
  const provinsi = idWilayah?.slice(0, 2) ?? "";
  if (PROVINSI_WIT.has(provinsi)) return WIT;
  if (PROVINSI_WITA.has(provinsi)) return WITA;
  return WIB;
}

/** Epoch → waktu lokal zona sebagai string ISO tanpa zona, "2026-09-25T15:00". */
export function waktuLokal(epochMs: number, zona: ZonaWaktu) {
  return new Date(epochMs + zona.offsetJam * 3_600_000).toISOString().slice(0, 16);
}

/** Rentang [awal, akhir) satu hari kalender di zona `zona` yang memuat `waktu`. */
export function rentangHariLokal(waktu: Date, zona: ZonaWaktu) {
  const offset = zona.offsetJam * 3_600_000;
  const awal = new Date(Math.floor((waktu.getTime() + offset) / 86_400_000) * 86_400_000 - offset);
  return { awal, akhir: new Date(awal.getTime() + 86_400_000) };
}
