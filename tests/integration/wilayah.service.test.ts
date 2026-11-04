/**
 * Integration test pencarian & lokasi desa/kelurahan terhadap data Kemendagri di database.
 * Jalankan: npm run test:integration (butuh migrasi + seed).
 */
import { afterAll, describe, expect, it } from "vitest";

const { db } = await import("@/server/db");
const { cariDesa, dataPemilih, desaTerdekat, lihatDesa } = await import("@/server/services/wilayah.service");

afterAll(() => db.$disconnect());

describe("cariDesa", () => {
  it("semua kata harus cocok dengan nama lengkap (desa + kecamatan/kab/kota)", async () => {
    const hasil = await cariDesa("sukarasa tangerang");
    expect(hasil.map((h) => h.idWilayah)).toEqual(["36.71.01.1001"]);
    expect(hasil[0]).toMatchObject({ jenis: "Kelurahan", namaWilayah: "Sukarasa" });
  });

  it("nama desa yang persis sama tampil lebih dulu", async () => {
    const hasil = await cariDesa("sukarasa");
    expect(hasil.length).toBeGreaterThan(1);
    expect(hasil.every((h) => h.namaWilayah === "Sukarasa")).toBe(true);
  });

  it("input tanpa huruf/angka → kosong", async () => {
    expect(await cariDesa("%%")).toEqual([]);
  });
});

describe("desaTerdekat", () => {
  it("titik di Dayeuhkolot → desa/kelurahan di Kec. Dayeuhkolot", async () => {
    const hasil = await desaTerdekat(-6.99, 107.625);
    expect(hasil?.idWilayah).toMatch(/^32\.04\.12\./);
    expect(hasil?.jarakKm).toBeLessThan(3);
  });

  it("titik di tengah laut jauh → null", async () => {
    expect(await desaTerdekat(-3, 90)).toBeNull();
  });
});

describe("lihatDesa & dataPemilih", () => {
  it("hanya kode desa/kelurahan yang bisa dipantau", async () => {
    expect(await lihatDesa("36.71")).toBeNull();
    const desa = await lihatDesa("36.71.01.1001");
    expect(desa?.leluhur.map((w) => w.idWilayah)).toEqual(["36", "36.71", "36.71.01", "36.71.01.1001"]);
  });

  it("pemilih terisi sesuai leluhur wilayah terpilih", async () => {
    const data = await dataPemilih("36.71.01.1001");
    expect(data.pilihan).toEqual({ provinsi: "36", kabkota: "36.71", kecamatan: "36.71.01", desa: "36.71.01.1001" });
    expect(data.daftar.provinsi).toHaveLength(38);
    expect(data.daftar.desa.some((d) => d.idWilayah === "36.71.01.1001")).toBe(true);

    const kosong = await dataPemilih(null);
    expect(kosong.pilihan.provinsi).toBeNull();
    expect(kosong.daftar.kabkota).toEqual([]);
  });
});
