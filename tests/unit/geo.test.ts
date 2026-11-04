import { describe, expect, it } from "vitest";
import { jarakKm } from "@/lib/geo";
import { RESOLUSI_GRID, titikDariKunci, titikGrid } from "@/lib/grid";

describe("geo", () => {
  it("jarak Jakarta–Bandung sekitar 120 km (garis lurus)", () => {
    const km = jarakKm(-6.2, 106.8167, -6.9175, 107.6191);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(130);
  });

  it("jarak titik yang sama = 0", () => {
    expect(jarakKm(-6.2, 106.8, -6.2, 106.8)).toBe(0);
  });
});

describe("grid 0,1°", () => {
  it("titik dibulatkan ke pusat sel terdekat", () => {
    expect(titikGrid(-6.1754, 106.8272)).toEqual({ kunciGrid: "-6.2,106.8", lat: -6.2, lng: 106.8 });
    expect(titikGrid(-6.149, 106.851)).toEqual({ kunciGrid: "-6.1,106.9", lat: -6.1, lng: 106.9 });
  });

  it("titik berdekatan (< 1 km) di sel yang sama berbagi satu data cuaca", () => {
    expect(titikGrid(-6.912, 107.61).kunciGrid).toBe(titikGrid(-6.918, 107.619).kunciGrid);
  });

  it("-0 dinormalkan dan kunci bisa dibaca balik", () => {
    expect(titikGrid(-0.01, 100.04).kunciGrid).toBe("0.0,100.0");
    expect(titikDariKunci("-6.2,106.8")).toEqual({ kunciGrid: "-6.2,106.8", lat: -6.2, lng: 106.8 });
  });

  it("jarak titik ke pusat selnya paling jauh setengah diagonal sel (±8 km)", () => {
    const t = titikGrid(-6.2499, 106.8499);
    expect(t.kunciGrid).toBe("-6.2,106.8");
    expect(jarakKm(-6.2499, 106.8499, t.lat, t.lng)).toBeLessThan((RESOLUSI_GRID / 2) * Math.SQRT2 * 111.4);
  });
});
