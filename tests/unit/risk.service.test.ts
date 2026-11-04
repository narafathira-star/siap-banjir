import { describe, expect, it } from "vitest";
import { ambangSeed } from "../../prisma/seed-data";
import {
  buatDeskripsiRisiko,
  cekAmbang,
  hitungLevelRisiko,
  pilihAmbangEfektif,
  terapkanSimulasi,
  type AmbangAcuan,
} from "@/server/services/risk.service";

// Ambang global = seed default (mengacu kategori BMKG).
const ambangGlobal: AmbangAcuan[] = ambangSeed.map((a) => ({
  idWilayah: null,
  parameter: a.parameter,
  nilaiMinimum: a.nilaiMinimum,
  nilaiMaksimum: a.nilaiMaksimum ?? null,
  levelRisiko: a.levelRisiko,
}));

const PROV = "33"; // Jawa Tengah
const KAB = "33.74"; // Kota Semarang
const DESA = "33.74.02.1002"; // Kelurahan Bulu Lor

/** Tiga rentang hujan_24jam: RENDAH < sedang ≤ SEDANG < tinggi ≤ TINGGI. */
const ambang24Jam = (idWilayah: string, sedang: number, tinggi: number): AmbangAcuan[] => [
  { idWilayah, parameter: "hujan_24jam", nilaiMinimum: 0, nilaiMaksimum: sedang, levelRisiko: "RENDAH" },
  { idWilayah, parameter: "hujan_24jam", nilaiMinimum: sedang, nilaiMaksimum: tinggi, levelRisiko: "SEDANG" },
  { idWilayah, parameter: "hujan_24jam", nilaiMinimum: tinggi, nilaiMaksimum: null, levelRisiko: "TINGGI" },
];

describe("hitungLevelRisiko", () => {
  it("semua parameter rendah → RENDAH, skor ≤ 33", () => {
    const hasil = hitungLevelRisiko(
      { hujan_1jam: 2, hujan_24jam: 5, hujan_3hari: 12, prakiraan_hujan_24jam: 3 },
      ambangGlobal,
    );
    expect(hasil.level).toBe("RENDAH");
    expect(hasil.adaData).toBe(true);
    expect(hasil.skorRisiko).toBeGreaterThanOrEqual(0);
    expect(hasil.skorRisiko).toBeLessThanOrEqual(33);
    expect(hasil.hasilPerParameter).toHaveLength(4);
  });

  it("satu parameter tinggi → TINGGI, dan hanya parameter itu yang jadi pemicu", () => {
    const hasil = hitungLevelRisiko(
      { hujan_1jam: 3, hujan_24jam: 72, hujan_3hari: 30, prakiraan_hujan_24jam: 25 },
      ambangGlobal,
    );
    expect(hasil.level).toBe("TINGGI");
    expect(hasil.skorRisiko).toBeGreaterThanOrEqual(67);
    expect(hasil.parameterPemicu.map((p) => p.parameter)).toEqual(["hujan_24jam"]);
    expect(buatDeskripsiRisiko(hasil)).toBe("Risiko TINGGI karena curah hujan 24 jam terakhir 72 mm.");
  });

  it("level akhir = level tertinggi (sedang + rendah → SEDANG)", () => {
    const hasil = hitungLevelRisiko({ hujan_24jam: 30, hujan_1jam: 1 }, ambangGlobal);
    expect(hasil.level).toBe("SEDANG");
    expect(hasil.skorRisiko).toBeGreaterThanOrEqual(34);
    expect(hasil.skorRisiko).toBeLessThanOrEqual(66);
  });

  it("nilai tepat di batas ambang masuk ke level atas (min ≤ nilai < maks)", () => {
    expect(cekAmbang({ hujan_24jam: 20 }, ambangGlobal)[0]?.level).toBe("SEDANG");
    expect(cekAmbang({ hujan_24jam: 50 }, ambangGlobal)[0]?.level).toBe("TINGGI");
    expect(cekAmbang({ hujan_24jam: 19.99 }, ambangGlobal)[0]?.level).toBe("RENDAH");
    expect(cekAmbang({ hujan_1jam: 0 }, ambangGlobal)[0]?.level).toBe("RENDAH");

    const tepat50 = hitungLevelRisiko({ hujan_24jam: 50 }, ambangGlobal);
    expect(tepat50.level).toBe("TINGGI");
    expect(tepat50.skorRisiko).toBe(67);
  });

  it("ambang khusus wilayah menimpa ambang global untuk parameter yang sama", () => {
    // Kota Semarang sangat rawan: hujan 24 jam ≥ 30 mm sudah TINGGI.
    const khusus = ambang24Jam(KAB, 15, 30);
    const nilai = { hujan_24jam: 35, hujan_1jam: 1 };

    expect(hitungLevelRisiko(nilai, ambangGlobal).level).toBe("SEDANG");

    const hasil = hitungLevelRisiko(nilai, [...ambangGlobal, ...khusus]);
    expect(hasil.level).toBe("TINGGI");
    expect(hasil.parameterPemicu[0]).toMatchObject({ parameter: "hujan_24jam", ambangKhusus: true });
    // Parameter lain tetap memakai ambang global.
    expect(hasil.hasilPerParameter.find((h) => h.parameter === "hujan_1jam")?.ambangKhusus).toBe(false);
  });

  it("data kosong → RENDAH, skor 0, adaData false", () => {
    const hasil = hitungLevelRisiko({}, ambangGlobal);
    expect(hasil).toMatchObject({ level: "RENDAH", skorRisiko: 0, parameterPemicu: [], adaData: false });
    expect(buatDeskripsiRisiko(hasil)).toMatch(/belum cukup/);
  });

  it("tanpa ambang sama sekali → dianggap tidak ada data", () => {
    expect(hitungLevelRisiko({ hujan_24jam: 100 }, []).adaData).toBe(false);
  });

  it("parameter tanpa ambang (peluang_hujan_max) diabaikan", () => {
    const hasil = hitungLevelRisiko({ peluang_hujan_max: 100, hujan_24jam: 1 }, ambangGlobal);
    expect(hasil.level).toBe("RENDAH");
    expect(hasil.hasilPerParameter.map((h) => h.parameter)).toEqual(["hujan_24jam"]);
  });

  it("skor tidak melebihi 100 untuk nilai ekstrem", () => {
    expect(hitungLevelRisiko({ hujan_24jam: 377 }, ambangGlobal).skorRisiko).toBe(100);
  });
});

describe("terapkanSimulasi (ambang tidak diubah)", () => {
  it("hujan simulasi 60 mm melewati ambang TINGGI global (≥ 50 mm)", () => {
    const asli = { hujan_1jam: 0, hujan_24jam: 0.5, hujan_3hari: 2, prakiraan_hujan_24jam: 1 };
    expect(hitungLevelRisiko(asli, ambangGlobal).level).toBe("RENDAH");

    const hasil = hitungLevelRisiko(terapkanSimulasi(asli, 60), ambangGlobal);
    expect(hasil.level).toBe("TINGGI");
    expect(hasil.parameterPemicu.map((p) => p.parameter)).toEqual(["hujan_24jam"]);
    expect(buatDeskripsiRisiko(hasil)).toBe("Risiko TINGGI karena curah hujan 24 jam terakhir 60 mm.");
  });

  it("hanya menaikkan: hujan asli yang lebih besar tetap dipakai; parameter lain tidak diubah", () => {
    const nilai = terapkanSimulasi({ hujan_1jam: 3, hujan_24jam: 80, hujan_3hari: 30, prakiraan_hujan_24jam: 5 }, 60);
    expect(nilai).toEqual({ hujan_1jam: 3, hujan_24jam: 80, hujan_3hari: 60, prakiraan_hujan_24jam: 5 });
  });

  it("nilai di bawah ambang TINGGI tidak menjadi TINGGI", () => {
    expect(hitungLevelRisiko(terapkanSimulasi({}, 35), ambangGlobal).level).toBe("SEDANG");
  });
});

describe("pewarisan ambang bertingkat (desa > kecamatan > kab/kota > provinsi > global)", () => {
  const nilai = { hujan_24jam: 35 };

  it("ambang kab/kota berlaku untuk desa di bawahnya", () => {
    expect(hitungLevelRisiko(nilai, [...ambangGlobal, ...ambang24Jam(KAB, 15, 30)]).level).toBe("TINGGI");
  });

  it("ambang tingkat lebih spesifik menimpa leluhurnya, tanpa dicampur", () => {
    // Provinsi longgar (TINGGI ≥ 100), kab/kota ketat (TINGGI ≥ 30), desa sedikit lebih longgar (TINGGI ≥ 40).
    const semua = [...ambangGlobal, ...ambang24Jam(PROV, 60, 100), ...ambang24Jam(KAB, 15, 30), ...ambang24Jam(DESA, 20, 40)];
    const efektif = pilihAmbangEfektif(semua).get("hujan_24jam") ?? [];
    expect(new Set(efektif.map((a) => a.idWilayah))).toEqual(new Set([DESA]));
    expect(hitungLevelRisiko(nilai, semua).level).toBe("SEDANG");
  });

  it("parameter tanpa ambang khusus di tingkat mana pun memakai ambang global", () => {
    const efektif = pilihAmbangEfektif([...ambangGlobal, ...ambang24Jam(KAB, 15, 30)]);
    expect(efektif.get("hujan_1jam")?.every((a) => a.idWilayah === null)).toBe(true);
    expect(efektif.get("hujan_24jam")?.every((a) => a.idWilayah === KAB)).toBe(true);
  });
});
