/**
 * Integration test langkah 9 (riwayat risiko tinggi) terhadap database asli.
 * Riwayat diagregasi per kab/kota per hari kalender di zona kab/kota itu (D-038, D-060).
 * Jalankan: npm run test:integration
 */
import type { TingkatRisiko } from "@prisma/client";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/server/integrations/web-push", () => ({
  kirimPush: async () => ({ ok: true }),
  pushTersedia: () => true,
}));
// tindakLanjutRisiko diimpor dari modul yang juga memakai after(); tidak dipanggil di sini.
vi.mock("next/server", () => ({ after: () => undefined }));

const { db } = await import("@/server/db");
const { tindakLanjutRisiko } = await import("@/server/services/pemantauan.service");
const { AWALAN_JUDUL_RIWAYAT, SUMBER_DETEKSI } = await import("@/server/services/riwayat.service");

const KAB_KOTA = "13.71"; // Kota Padang
const DESA_A = "13.71.01.1001"; // Kelurahan Belakang Pondok, Kec. Padang Selatan
const DESA_B = "13.71.02.1009"; // Kelurahan Parak Gadang Timur, Kec. Padang Timur
const KAB_WIT = "82.71"; // Kota Ternate (WIT)
const DESA_WIT = "82.71.01.1001"; // Kelurahan Jambula
const cuacaDibuat: string[] = [];
const waktuUji = new Date("2020-02-02T05:00:00Z"); // tanggal lampau agar tidak bentrok dengan data nyata

async function buatRisiko(level: TingkatRisiko, idWilayah = DESA_A, waktu = waktuUji) {
  const cuaca = await db.dataCuaca.create({
    data: {
      // Sel grid di laut (tanpa desa) agar tidak tercampur cache cuaca nyata.
      kunciGrid: "0.0,0.0",
      gridLatitude: 0,
      gridLongitude: 0,
      curahHujan: 0,
      suhu: 27,
      kelembapan: 90,
      kondisiCuaca: 65,
      kecepatanAngin: 8,
      waktuPengamatan: waktu,
      waktuAmbil: waktu,
      rawJson: { uji: true },
    },
  });
  cuacaDibuat.push(cuaca.idCuaca);
  return db.levelRisiko.create({
    data: {
      idWilayah,
      idCuaca: cuaca.idCuaca,
      level,
      skorRisiko: 85,
      deskripsi: `Risiko ${level} karena curah hujan 24 jam terakhir 80 mm.`,
      parameterPemicu: [{ parameter: "hujan_24jam", nilai: 80, level, skor: 85, ambangKhusus: false, pemicu: true }],
      waktu,
    },
  });
}

const riwayatUji = (idWilayah = KAB_KOTA) =>
  db.informasi.findMany({
    where: {
      idWilayah,
      judul: { startsWith: AWALAN_JUDUL_RIWAYAT },
      tanggal: { gte: new Date("2020-02-01T00:00:00Z"), lt: new Date("2020-02-05T00:00:00Z") },
    },
    orderBy: { tanggal: "asc" },
  });

afterAll(async () => {
  const semua = [...(await riwayatUji()), ...(await riwayatUji(KAB_WIT))];
  await db.informasi.deleteMany({ where: { idInformasi: { in: semua.map((i) => i.idInformasi) } } });
  await db.dataCuaca.deleteMany({ where: { idCuaca: { in: cuacaDibuat } } });
  await db.$disconnect();
});

describe("tindakLanjutRisiko: simpan riwayat risiko tinggi", () => {
  it("SEDANG tidak disimpan sebagai riwayat", async () => {
    expect((await tindakLanjutRisiko(await buatRisiko("SEDANG"))).riwayat).toBe(false);
    expect(await riwayatUji()).toHaveLength(0);
  });

  it("TINGGI: satu entri per kab/kota per hari (WIB), desa lain ditambahkan ke entri yang sama", async () => {
    expect((await tindakLanjutRisiko(await buatRisiko("TINGGI"))).riwayat).toBe("dibuat");
    // Desa yang sama di hari yang sama tidak menambah apa pun.
    const lagi = await buatRisiko("TINGGI", DESA_A, new Date("2020-02-02T10:00:00Z"));
    expect((await tindakLanjutRisiko(lagi)).riwayat).toBe(false);
    // Desa lain di kab/kota yang sama → entri hari itu diperbarui.
    const desaLain = await buatRisiko("TINGGI", DESA_B, new Date("2020-02-02T11:00:00Z"));
    expect((await tindakLanjutRisiko(desaLain)).riwayat).toBe("diperbarui");
    // Hari berikutnya (WIB) → entri baru.
    const besok = await buatRisiko("TINGGI", DESA_A, new Date("2020-02-02T18:00:00Z")); // 3 Feb 01:00 WIB
    expect((await tindakLanjutRisiko(besok)).riwayat).toBe("dibuat");

    const daftar = await riwayatUji();
    expect(daftar).toHaveLength(2);
    expect(daftar[0]).toMatchObject({ kategori: "RIWAYAT_KEJADIAN", idWilayah: KAB_KOTA, judul: `${AWALAN_JUDUL_RIWAYAT} Kota Padang` });
    expect(daftar[0]?.isi).toContain("Kelurahan Belakang Pondok, Kec. Padang Selatan");
    expect(daftar[0]?.isi).toContain("Kelurahan Parak Gadang Timur, Kec. Padang Timur");
    expect(daftar[0]?.isi).toContain("bukan laporan kejadian banjir yang terverifikasi");
    expect(daftar[0]).toMatchObject({ sumberNama: SUMBER_DETEKSI.nama, sumberUrl: "https://open-meteo.com/" });
    expect(daftar[1]?.isi).not.toContain("Parak Gadang Timur");
  });

  it("deteksi paralel di kab/kota yang sama tidak membuat entri ganda", async () => {
    const waktu = new Date("2020-02-04T03:00:00Z");
    const risiko = await Promise.all([buatRisiko("TINGGI", DESA_A, waktu), buatRisiko("TINGGI", DESA_B, waktu)]);
    const hasil = await Promise.all(risiko.map((r) => tindakLanjutRisiko(r)));
    expect(hasil.map((h) => h.riwayat).sort()).toEqual(["dibuat", "diperbarui"]);
    const hariItu = (await riwayatUji()).filter((i) => i.tanggal >= new Date("2020-02-03T17:00:00Z"));
    expect(hariItu).toHaveLength(1);
  });
});

describe("riwayat dekat tengah malam memakai zona lokasi kejadian (D-060, D-061)", () => {
  it("Kota Ternate: 23:50 WIT dan 00:10 WIT = dua hari berbeda, walau keduanya 2 Februari menurut WIB", async () => {
    // 14:50 UTC = 21:50 WIB = 23:50 WIT (2 Feb); 15:10 UTC = 22:10 WIB (2 Feb) = 00:10 WIT (3 Feb).
    const sebelum = await buatRisiko("TINGGI", DESA_WIT, new Date("2020-02-02T14:50:00Z"));
    const sesudah = await buatRisiko("TINGGI", DESA_WIT, new Date("2020-02-02T15:10:00Z"));
    expect((await tindakLanjutRisiko(sebelum)).riwayat).toBe("dibuat");
    expect((await tindakLanjutRisiko(sesudah)).riwayat).toBe("dibuat");

    const daftar = await riwayatUji(KAB_WIT);
    expect(daftar).toHaveLength(2);
    expect(daftar[0]?.isi).toContain("pada Minggu, 2 Februari 2020.");
    expect(daftar[0]?.isi).toContain("(23:50 WIT)");
    expect(daftar[1]?.isi).toContain("pada Senin, 3 Februari 2020.");
    expect(daftar[1]?.isi).toContain("(00:10 WIT)");
    for (const d of daftar) expect(d.isi).not.toContain("WIB");
  });
});
