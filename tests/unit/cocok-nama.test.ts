import { describe, expect, it } from "vitest";
import { cocokkanNama, normalisasiNama } from "../../scripts/lib/cocok-nama";

describe("normalisasiNama", () => {
  it("huruf kecil, tanpa tanda baca, singkatan diperluas", () => {
    expect(normalisasiNama("Kab. Pangkajene  dan Kepulauan")).toBe("kabupaten pangkajene dan kepulauan");
    expect(normalisasiNama("Kel. Sukarasa")).toBe("kelurahan sukarasa");
    expect(normalisasiNama("Pulau-pulau Babar Timur")).toBe("pulau pulau babar timur");
  });
});

describe("cocokkanNama (kode sama, dua sumber)", () => {
  it("sama setelah normalisasi", () => {
    expect(cocokkanNama("Pulau-pulau Babar Timur", "Pulau-Pulau Babar Timur")).toBe("sama");
  });

  // Kasus nyata dari laporan impor 25 September 2026.
  it.each([
    ["Gedok Kulon", "Gedog Kulon"],
    ["Tanjung Jati", "Tangjung Jati"],
    ["Labuan Kananga", "Labuhan Kananga"],
    ["Sinembah Tanjung Muda Hulu", "SSinembah Tanjung Muda Hulu"],
    ["Ammasangan", "Amasangan"],
  ])("beda ejaan/typo kecil: %s ↔ %s", (a, b) => {
    expect(cocokkanNama(a, b)).toBe("ejaan");
  });

  it("beda spasi dan ejaan lama dianggap ejaan", () => {
    expect(cocokkanNama("Dayeuhkolot", "Dayeuh Kolot")).toBe("ejaan");
    expect(cocokkanNama("Tjilatjap", "Cilacap")).toBe("ejaan");
    expect(cocokkanNama("Soerabaja Djaja", "Surabaja Jaja")).toBe("ejaan");
  });

  it("nama yang benar-benar lain → berbeda (koordinat tidak dipakai)", () => {
    expect(cocokkanNama("Sukarasa", "Babakan")).toBe("berbeda");
    expect(cocokkanNama("Tangerang", "Tangerang Selatan")).toBe("berbeda");
  });
});
