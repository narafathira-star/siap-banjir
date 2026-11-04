import { describe, expect, it } from "vitest";
import { teksHasilCek } from "@/lib/hasil-cek";
import { WIB, WIT, WITA } from "@/lib/zona-waktu";

// 01:33 / 01:46 / 01:48 WIB (UTC+7).
const DATA_0133 = "2026-09-29T18:33:21.000Z";
const DICEK_0146 = new Date("2026-09-29T18:46:05.000Z");

describe("teksHasilCek (D-057)", () => {
  it("data baru → jam data baru", () => {
    const teks = teksHasilCek({
      dicek: DICEK_0146,
      waktuDataSebelum: DATA_0133,
      waktuData: "2026-09-29T18:48:02.000Z",
      sumber: "api",
      zona: WIB,
    });
    expect(teks).toBe("Data diperbarui pukul 01:48 WIB.");
  });

  it("cache < 15 menit → sudah dicek, data terbaru, dan kapan data baru bisa diambil", () => {
    const teks = teksHasilCek({ dicek: DICEK_0146, waktuDataSebelum: DATA_0133, waktuData: DATA_0133, sumber: "cache", zona: WIB });
    expect(teks).toBe(
      "Sudah dicek 01:46 WIB · data terbaru dari 01:33 WIB. Data cuaca diambil ulang paling cepat 15 menit sekali, berikutnya 01:48 WIB.",
    );
  });

  it("jam mengikuti zona wilayah: 01:46 WIB = 03:46 WIT (D-060)", () => {
    const teks = teksHasilCek({ dicek: DICEK_0146, waktuDataSebelum: DATA_0133, waktuData: DATA_0133, sumber: "cache", zona: WIT });
    expect(teks).toBe(
      "Sudah dicek 03:46 WIT · data terbaru dari 03:33 WIT. Data cuaca diambil ulang paling cepat 15 menit sekali, berikutnya 03:48 WIT.",
    );
  });

  it("data cadangan / hemat kuota → tanpa janji jam berikutnya (dijelaskan StatusData)", () => {
    for (const sumber of ["cadangan", "hemat-kuota"] as const) {
      expect(teksHasilCek({ dicek: DICEK_0146, waktuDataSebelum: DATA_0133, waktuData: DATA_0133, sumber, zona: WIB })).toBe(
        "Sudah dicek 01:46 WIB · data terbaru dari 01:33 WIB.",
      );
    }
  });

  // D-062: jam cek dan jam data di menit yang sama → versi singkat, semua jam bersama zona.
  const DATA_0411 = "2026-09-29T21:11:02.000Z"; // 04:11 WIB = 06:11 WIT
  const DICEK_0411 = new Date("2026-09-29T21:11:48.000Z");

  it("jam cek = jam data → versi singkat dengan jam berikutnya (WIT)", () => {
    expect(teksHasilCek({ dicek: DICEK_0411, waktuDataSebelum: DATA_0411, waktuData: DATA_0411, sumber: "cache", zona: WIT })).toBe(
      "Data sudah terbaru (06:11 WIT). Bisa diperbarui lagi pukul 06:26 WIT.",
    );
  });

  it("menit yang sama di zona lain: WIB dan WITA", () => {
    const dasar = { dicek: DICEK_0411, waktuDataSebelum: DATA_0411, waktuData: DATA_0411, sumber: "cache" as const };
    expect(teksHasilCek({ ...dasar, zona: WIB })).toBe("Data sudah terbaru (04:11 WIB). Bisa diperbarui lagi pukul 04:26 WIB.");
    expect(teksHasilCek({ ...dasar, zona: WITA })).toBe("Data sudah terbaru (05:11 WITA). Bisa diperbarui lagi pukul 05:26 WITA.");
  });

  it("menit yang sama, data cadangan → tanpa jam berikutnya", () => {
    expect(teksHasilCek({ dicek: DICEK_0411, waktuDataSebelum: DATA_0411, waktuData: DATA_0411, sumber: "cadangan", zona: WIT })).toBe(
      "Data sudah terbaru (06:11 WIT).",
    );
  });

  it("beda satu menit → versi lengkap", () => {
    const dicek = new Date("2026-09-29T21:12:01.000Z");
    expect(teksHasilCek({ dicek, waktuDataSebelum: DATA_0411, waktuData: DATA_0411, sumber: "cache", zona: WIT })).toMatch(
      /^Sudah dicek 06:12 WIT · data terbaru dari 06:11 WIT\. /,
    );
  });

  it("setiap jam di semua versi diikuti zona", () => {
    const kasus = [
      { dicek: DICEK_0146, waktuDataSebelum: DATA_0133, waktuData: "2026-09-29T18:48:02.000Z", sumber: "api" as const },
      { dicek: DICEK_0146, waktuDataSebelum: DATA_0133, waktuData: DATA_0133, sumber: "cache" as const },
      { dicek: DICEK_0411, waktuDataSebelum: DATA_0411, waktuData: DATA_0411, sumber: "cache" as const },
      { dicek: DICEK_0146, waktuDataSebelum: DATA_0133, waktuData: DATA_0133, sumber: "hemat-kuota" as const },
    ];
    for (const zona of [WIB, WITA, WIT]) {
      for (const k of kasus) {
        const teks = teksHasilCek({ ...k, zona });
        const jam = teks.match(/\d{2}:\d{2}/g) ?? [];
        const jamBerzona = teks.match(new RegExp(`\\d{2}:\\d{2} ${zona.singkatan}\\b`, "g")) ?? [];
        expect(jam.length, teks).toBeGreaterThan(0);
        expect(jamBerzona.length, teks).toBe(jam.length);
      }
    }
  });
});
