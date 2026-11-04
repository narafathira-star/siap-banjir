import { describe, expect, it } from "vitest";
import { cocokkanNama, normalisasiNama } from "../../scripts/lib/cocok-nama";
import { indukKode, jenisWilayah, kodeKabKota, kodeValid, leluhurKode, levelKode } from "@/lib/kode-wilayah";

describe("kode wilayah Kemendagri", () => {
  it("validasi format bertitik", () => {
    for (const k of ["36", "36.71", "36.71.01", "36.71.01.1001"]) expect(kodeValid(k)).toBe(true);
    for (const k of ["3", "3671", "36.7", "36.71.01.100", "36.71.01.1001.1", "kota-tangerang", "36.71.01.1001 "])
      expect(kodeValid(k)).toBe(false);
  });

  it("level, induk, leluhur, kab/kota", () => {
    expect(levelKode("36")).toBe("PROVINSI");
    expect(levelKode("36.71.01.1001")).toBe("DESA");
    expect(indukKode("36.71.01.1001")).toBe("36.71.01");
    expect(indukKode("36")).toBeNull();
    expect(leluhurKode("36.71.01.1001")).toEqual(["36", "36.71", "36.71.01", "36.71.01.1001"]);
    expect(kodeKabKota("36.71.01.1001")).toBe("36.71");
    expect(kodeKabKota("36")).toBeNull();
  });

  it("jenis: kabupaten 01–69, kota 71–99, kelurahan 1xxx, desa 2xxx/3xxx", () => {
    expect(jenisWilayah("32.04")).toBe("Kabupaten");
    expect(jenisWilayah("32.73")).toBe("Kota");
    expect(jenisWilayah("36.71.01.1001")).toBe("Kelurahan");
    expect(jenisWilayah("11.01.01.2001")).toBe("Desa");
    expect(jenisWilayah("51.01.01.3001")).toBe("Desa");
  });
});

describe("pencocokan nama antar-sumber", () => {
  it("normalisasi singkatan, huruf, tanda baca", () => {
    expect(normalisasiNama("Kab. Aceh  Selatan")).toBe("kabupaten aceh selatan");
    expect(normalisasiNama("Kota Tangerang Selatan")).toBe("kota tangerang selatan");
  });

  it.each([
    ["Kabupaten Aceh Selatan", "Kab. Aceh Selatan", "sama"],
    ["Suka Maju", "Sukamaju", "ejaan"],
    ["Tjilatjap", "Cilacap", "ejaan"],
    ["Karang Mulya", "Karangmulia", "ejaan"],
    ["Sukarasa", "Babakan", "berbeda"],
  ] as const)("%s ↔ %s = %s", (a, b, hasil) => {
    expect(cocokkanNama(a, b)).toBe(hasil);
  });
});
