import { describe, expect, it } from "vitest";
import { formatJam, formatJamZona, formatTanggal } from "@/lib/format";
import { WIB, WIT, WITA, zonaWilayah } from "@/lib/zona-waktu";

describe("zona waktu per provinsi (D-060)", () => {
  it("WIB: Sumatra, Jawa, Kalimantan Barat & Tengah; kode tingkat apa pun", () => {
    for (const kode of ["11", "12.71", "33.74.02.1002", "36", "61", "62.01"]) expect(zonaWilayah(kode), kode).toBe(WIB);
  });

  it("WITA: Bali, Nusa Tenggara, Kalimantan Selatan/Timur/Utara, Sulawesi", () => {
    for (const kode of ["51.71.01.1001", "52", "53.16", "63.71", "64.72", "65", "71.09", "73.17", "75", "76"]) {
      expect(zonaWilayah(kode), kode).toBe(WITA);
    }
  });

  it("WIT: Maluku, Maluku Utara, semua provinsi Papua", () => {
    for (const kode of ["81", "82.71.01.1001", "91", "92", "93", "94", "95.08", "96.71.05.1004"]) {
      expect(zonaWilayah(kode), kode).toBe(WIT);
    }
  });

  it("tanpa wilayah → WIB", () => {
    expect(zonaWilayah(null)).toBe(WIB);
    expect(zonaWilayah(undefined)).toBe(WIB);
  });

  it("jam dan tanggal diformat di zona wilayah", () => {
    const t = new Date("2026-09-29T18:33:00Z"); // 01:33 WIB, 02:33 WITA, 03:33 WIT (30 Sep)
    expect(formatJam(t, WIB)).toBe("01:33");
    expect(formatJamZona(t, WITA)).toBe("02:33 WITA");
    expect(formatJamZona(t, WIT)).toBe("03:33 WIT");
    // 16:30 UTC 29 Sep = 23:30 WIB (29 Sep) tetapi 01:30 WIT (30 Sep).
    const malam = new Date("2026-09-29T16:30:00Z");
    expect(formatTanggal(malam, WIB)).toBe("29 Sep 2026");
    expect(formatTanggal(malam, WIT)).toBe("30 Sep 2026");
  });
});
