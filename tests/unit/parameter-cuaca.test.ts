import { describe, expect, it } from "vitest";
import { parseWaktuLokal } from "@/server/integrations/open-meteo";
import { hitungParameterCuaca } from "@/server/services/parameter-cuaca";
import { buatRespons } from "../fixtures/open-meteo";

describe("parseWaktuLokal", () => {
  it("mengonversi waktu WIB ke UTC", () => {
    expect(parseWaktuLokal("2026-09-25T13:00", 25200).toISOString()).toBe("2026-09-25T06:00:00.000Z");
  });
});

describe("hitungParameterCuaca", () => {
  it("menghitung jendela 24 jam lalu & 24 jam ke depan dari jam sekarang", () => {
    // 1 mm setiap jam → 24 jam = 24 mm di kedua jendela.
    const raw = buatRespons({
      currentTime: "2026-09-25T13:15",
      hujanPerJam: () => 1,
      hujanHarian: [10, 20, 30, 40, 50],
    });
    const nilai = hitungParameterCuaca(raw);
    expect(nilai.hujan_24jam).toBe(24);
    expect(nilai.prakiraan_hujan_24jam).toBe(24);
    // 3 hari = 23, 24, 25 September.
    expect(nilai.hujan_3hari).toBe(60);
    expect(nilai.peluang_hujan_max).toBe(50);
  });

  it("jendela 24 jam lalu mencakup jam sekarang, bukan jam berikutnya", () => {
    const raw = buatRespons({
      currentTime: "2026-09-25T13:00",
      hujanPerJam: (t) => (t === "2026-09-25T13:00" ? 30 : t === "2026-09-25T14:00" ? 7 : 0),
      hujanHarian: [0, 0, 0, 0, 0],
    });
    const nilai = hitungParameterCuaca(raw);
    expect(nilai.hujan_24jam).toBe(30);
    expect(nilai.prakiraan_hujan_24jam).toBe(7);
    // hujan_1jam = maks(current 15 menit, jam terakhir).
    expect(nilai.hujan_1jam).toBe(30);
  });

  it("hujan_1jam memakai current.precipitation jika lebih besar", () => {
    const raw = buatRespons({
      currentTime: "2026-09-25T13:30",
      currentPrecip: 12,
      hujanPerJam: () => 2,
      hujanHarian: [0, 0, 0, 0, 0],
    });
    expect(hitungParameterCuaca(raw).hujan_1jam).toBe(12);
  });

  it("parameter tanpa data (semua null) dihilangkan, bukan dianggap 0", () => {
    const raw = buatRespons({
      currentTime: "2026-09-25T13:00",
      hujanPerJam: () => null,
      peluangPerJam: () => null,
      hujanHarian: [null, null, null, null, null],
    });
    const nilai = hitungParameterCuaca(raw);
    expect(nilai.hujan_24jam).toBeUndefined();
    expect(nilai.hujan_3hari).toBeUndefined();
    expect(nilai.peluang_hujan_max).toBeUndefined();
    expect(nilai.hujan_1jam).toBe(0); // dari current
  });
});
