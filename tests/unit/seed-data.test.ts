import { describe, expect, it } from "vitest";
import { bacaDataWilayah } from "../../prisma/data-wilayah";
import {
  ambangSeed,
  BUKU_SAKU_BNPB,
  informasiSeed,
  persiapanSeed,
  profilWilayahSeed,
  rekomendasiSeed,
  sumberBukuSaku,
} from "../../prisma/seed-data";
import { indukKode, kodeValid, levelKode } from "@/lib/kode-wilayah";
import {
  ambangRisikoInputSchema,
  informasiInputSchema,
  persiapanDiniInputSchema,
  rekomendasiInputSchema,
  wilayahInputSchema,
} from "@/server/validators/konten";

const LEVEL = ["RENDAH", "SEDANG", "TINGGI"] as const;

const wilayah = bacaDataWilayah();
const namaPerKode = new Map(wilayah.map((w) => [w.idWilayah, w.namaWilayah]));

describe("data wilayah Kemendagri (prisma/data/wilayah.tsv.gz)", () => {
  it("jumlah per tingkat sesuai Kepmendagri 300.2.2-2430/2025", () => {
    const jumlah = { PROVINSI: 0, KABKOTA: 0, KECAMATAN: 0, DESA: 0 };
    for (const w of wilayah) jumlah[levelKode(w.idWilayah)]++;
    expect(jumlah).toEqual({ PROVINSI: 38, KABKOTA: 514, KECAMATAN: 7285, DESA: 83762 });
  });

  // Kumpulkan pelanggaran lalu cek sekali (91 ribu baris; expect per baris terlalu lambat).
  it("kode unik, format valid, dan setiap wilayah punya induk", () => {
    expect(namaPerKode.size).toBe(wilayah.length);
    const salah = wilayah.filter((w) => {
      const induk = indukKode(w.idWilayah);
      return !kodeValid(w.idWilayah) || (induk !== null && !namaPerKode.has(induk));
    });
    expect(salah).toEqual([]);
  });

  it("semua baris valid dan koordinat berada di wilayah Indonesia", () => {
    const salah = wilayah.filter(
      (w) =>
        !wilayahInputSchema.safeParse(w).success ||
        !(w.koordinatLatitude > -11.5 && w.koordinatLatitude < 6.5) ||
        !(w.koordinatLongitude > 94.5 && w.koordinatLongitude < 141.5),
    );
    expect(salah).toEqual([]);
  });
});

describe("seed profil wilayah", () => {
  it("kode ada di data Kemendagri dan namanya cocok", () => {
    for (const p of profilWilayahSeed) expect(namaPerKode.get(p.idWilayah)).toBe(p.namaWilayah);
  });

  it("kode unik", () => {
    const ids = profilWilayahSeed.map((p) => p.idWilayah);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("seed ambang risiko", () => {
  it("semua ambang valid", () => {
    for (const a of ambangSeed) expect(() => ambangRisikoInputSchema.parse(a)).not.toThrow();
  });

  it("rentang per parameter bersambung dari 0 sampai tak hingga tanpa celah/tumpang tindih", () => {
    const parameters = [...new Set(ambangSeed.map((a) => a.parameter))];
    for (const p of parameters) {
      const rentang = ambangSeed
        .filter((a) => a.parameter === p && a.idWilayah == null)
        .sort((x, y) => x.nilaiMinimum - y.nilaiMinimum);
      expect(rentang[0]?.nilaiMinimum).toBe(0);
      for (let i = 1; i < rentang.length; i++) {
        expect(rentang[i]?.nilaiMinimum).toBe(rentang[i - 1]?.nilaiMaksimum);
      }
      expect(rentang.at(-1)?.nilaiMaksimum ?? null).toBeNull();
      expect(rentang.map((r) => r.levelRisiko)).toEqual([...LEVEL]);
    }
  });
});

describe("seed konten", () => {
  it("persiapan & rekomendasi global tersedia untuk setiap level", () => {
    for (const level of LEVEL) {
      expect(persiapanSeed.some((p) => p.levelRisiko === level && p.idWilayah == null)).toBe(true);
      expect(rekomendasiSeed.some((r) => r.levelRisiko === level && r.idWilayah == null)).toBe(true);
    }
  });

  it("semua konten valid dan hanya merujuk kode wilayah yang ada", () => {
    for (const p of persiapanSeed) {
      expect(() => persiapanDiniInputSchema.parse(p)).not.toThrow();
      if (p.idWilayah) expect(namaPerKode.has(p.idWilayah)).toBe(true);
    }
    for (const r of rekomendasiSeed) {
      expect(() => rekomendasiInputSchema.parse(r)).not.toThrow();
      if (r.idWilayah) expect(namaPerKode.has(r.idWilayah)).toBe(true);
    }
    for (const i of informasiSeed) {
      expect(() => informasiInputSchema.parse(i)).not.toThrow();
      if (i.idWilayah) expect(namaPerKode.has(i.idWilayah)).toBe(true);
    }
  });

  it("ada informasi UMUM dan RIWAYAT_KEJADIAN", () => {
    expect(informasiSeed.some((i) => i.kategori === "UMUM")).toBe(true);
    expect(informasiSeed.some((i) => i.kategori === "RIWAYAT_KEJADIAN")).toBe(true);
  });

  it("setiap riwayat kejadian punya nama sumber dan tautan https yang unik", () => {
    const riwayat = informasiSeed.filter((i) => i.kategori === "RIWAYAT_KEJADIAN");
    for (const r of riwayat) {
      expect(r.sumberNama, r.judul).toBeTruthy();
      expect(r.sumberUrl, r.judul).toMatch(/^https:\/\//);
    }
    // Satu rilis boleh dipakai beberapa provinsi (mis. bansor Sumatra 2025, D-059), tidak untuk wilayah yang sama.
    expect(new Set(riwayat.map((r) => `${r.sumberUrl}|${r.idWilayah}`)).size).toBe(riwayat.length);
    expect(new Set(riwayat.map((r) => r.judul)).size).toBe(riwayat.length);
  });

  it("sumber riwayat seed adalah situs resmi pemerintah (BNPB/BMKG diutamakan)", () => {
    for (const r of informasiSeed.filter((i) => i.kategori === "RIWAYAT_KEJADIAN")) {
      expect(new URL(r.sumberUrl ?? "").hostname, r.judul).toMatch(/\.go\.id$/);
      if (r.sumberTanggalUrl) expect(new URL(r.sumberTanggalUrl).hostname, r.judul).toMatch(/\.go\.id$/);
    }
  });

  it("riwayat: tanggal kejadian dari sumber kedua dan 'Data per' tidak dipakai bersamaan (D-059)", () => {
    for (const r of informasiSeed.filter((i) => i.kategori === "RIWAYAT_KEJADIAN")) {
      expect(Boolean(r.sumberTanggalNama), r.judul).toBe(Boolean(r.sumberTanggalUrl));
      expect(r.sumberTanggalUrl && r.tanggalDataPer, r.judul).toBeFalsy();
      expect(r.sumberTanggalUrl, r.judul).not.toBe(r.sumberUrl);
      expect(r.tanggal, r.judul).toBeTruthy();
    }
  });

  it("sumberUrl selain https ditolak validator", () => {
    const dasar = { kategori: "RIWAYAT_KEJADIAN" as const, judul: "Uji", isi: "Uji", sumberNama: "Uji" };
    expect(informasiInputSchema.safeParse({ ...dasar, sumberUrl: "http://contoh.go.id/a" }).success).toBe(false);
    expect(informasiInputSchema.safeParse({ ...dasar, sumberUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(informasiInputSchema.safeParse({ ...dasar, sumberUrl: "https://contoh.go.id/a" }).success).toBe(true);
  });
});

describe("seed Detail Mitigasi (Buku Saku BNPB, D-044)", () => {
  it("setiap rekomendasi global merujuk Buku Saku BNPB beserta halamannya", () => {
    for (const r of rekomendasiSeed.filter((x) => x.idWilayah == null)) {
      expect(r.sumberNama?.startsWith(`${BUKU_SAKU_BNPB.nama}, hal. `), r.isiRekomendasi).toBe(true);
      expect(r.sumberNama, r.isiRekomendasi).toMatch(/, hal\. \d+(–\d+)?(, \d+)?$/);
      expect(r.sumberUrl, r.isiRekomendasi).toMatch(/^https:\/\/www\.bnpb\.go\.id\/.+#page=\d+$/);
    }
  });

  it("#page menunjuk halaman PDF = halaman cetak + 2", () => {
    expect(sumberBukuSaku("36")).toEqual({
      sumberNama: `${BUKU_SAKU_BNPB.nama}, hal. 36`,
      sumberUrl: `${BUKU_SAKU_BNPB.url}#page=38`,
    });
    expect(sumberBukuSaku("38–39").sumberUrl).toBe(`${BUKU_SAKU_BNPB.url}#page=40`);
  });

  it("bagian 'Jika banjir terjadi' hanya ada di level TINGGI", () => {
    const jikaBanjir = rekomendasiSeed.filter((r) => r.bagian === "JIKA_BANJIR");
    expect(jikaBanjir.length).toBeGreaterThan(0);
    expect(new Set(jikaBanjir.map((r) => r.levelRisiko))).toEqual(new Set(["TINGGI"]));
    expect(rekomendasiSeed.some((r) => r.levelRisiko === "TINGGI" && r.bagian !== "JIKA_BANJIR")).toBe(true);
  });

  it("validator menolak JIKA_BANJIR di luar level TINGGI dan sumber non-https", () => {
    const dasar = { levelRisiko: "SEDANG", isiRekomendasi: "x", urutan: 1 } as const;
    expect(rekomendasiInputSchema.safeParse({ ...dasar, bagian: "JIKA_BANJIR" }).success).toBe(false);
    expect(rekomendasiInputSchema.safeParse({ ...dasar, levelRisiko: "TINGGI", bagian: "JIKA_BANJIR" }).success).toBe(true);
    expect(rekomendasiInputSchema.safeParse({ ...dasar, sumberUrl: "http://www.bnpb.go.id/a.pdf" }).success).toBe(false);
  });

  it("panduan pascabencana tersedia di Informasi dengan sumber BNPB", () => {
    const pasca = informasiSeed.find((i) => i.judul.startsWith("Setelah Banjir Surut"));
    expect(pasca?.kategori).toBe("UMUM");
    expect(pasca?.sumberNama).toBe(`${BUKU_SAKU_BNPB.nama}, hal. 38–39`);
  });
});
