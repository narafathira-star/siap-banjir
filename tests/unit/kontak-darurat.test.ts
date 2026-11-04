import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { KONTAK_BPBD } from "@/data/kontak-bpbd";
import data from "@/data/layanan-112.json";
import { keteranganLayanan112, statusLayanan112 } from "@/lib/layanan-112";

const kabKota = new Set(
  gunzipSync(readFileSync("prisma/data/wilayah.tsv.gz"))
    .toString("utf8")
    .split("\n")
    .map((b) => b.split("\t")[0] ?? "")
    .filter((k) => k.length === 5),
);

describe("data layanan 112", () => {
  it("mencatat sumber dan tanggal pengambilan", () => {
    expect(data.sumber.url).toMatch(/^https:\/\/layanan112\.komdigi\.go\.id\//);
    expect(data.diambilPada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("setiap entri kab/kota Kemendagri yang valid, tanpa duplikat", () => {
    const kode = data.daftar.map((e) => e.idWilayah);
    expect(new Set(kode).size).toBe(kode.length);
    for (const k of kode) expect(kabKota.has(k), k).toBe(true);
  });

  it("tanggal launching hanya ada (dan wajib ada) untuk status Sudah Launching", () => {
    for (const e of data.daftar) {
      if (e.status === 1) expect(e.tanggalLaunching, e.idWilayah).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      else expect(e.tanggalLaunching, e.idWilayah).toBeNull();
    }
  });
});

describe("statusLayanan112", () => {
  it("kab/kota yang sudah launching", () => {
    const s = statusLayanan112("36.71");
    expect(s).toMatchObject({ tersedia: true, statusLabel: "Sudah Launching" });
    expect(keteranganLayanan112("Kota Tangerang", s)).toMatch(/^Layanan 112 Kota Tangerang sudah diluncurkan sejak \d+ \w+ \d{4}\.$/);
  });

  it("kab/kota dengan status lain tidak dianggap tersedia", () => {
    const lain = data.daftar.find((e) => e.status !== 1);
    expect(lain).toBeDefined();
    const s = statusLayanan112(lain!.idWilayah);
    expect(s.tersedia).toBe(false);
    expect(keteranganLayanan112("X", s)).toContain(`berstatus "${lain!.statusLabel}"`);
  });

  it("kab/kota yang tidak ada di portal", () => {
    const tidakAda = [...kabKota].find((k) => !data.daftar.some((e) => e.idWilayah === k));
    const s = statusLayanan112(tidakAda!);
    expect(s).toEqual({ tersedia: false, statusLabel: null, tanggalLaunching: null });
    expect(keteranganLayanan112("X", s)).toContain("belum tercatat memiliki layanan 112");
  });
});

describe("KONTAK_BPBD", () => {
  it("setiap nomor bersumber halaman resmi *.go.id dan punya tanggal pemeriksaan", () => {
    for (const [kode, k] of Object.entries(KONTAK_BPBD)) {
      expect(kode.length === 2 || kabKota.has(kode), kode).toBe(true);
      expect(new URL(k.sumberUrl).protocol, kode).toBe("https:");
      expect(new URL(k.sumberUrl).hostname, kode).toMatch(/(^|\.)go\.id$/);
      expect(k.diperiksaPada, kode).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(k.telepon, kode).toMatch(/^[0-9 ()+-]{3,20}$/);
    }
  });
});
