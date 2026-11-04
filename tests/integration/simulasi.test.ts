/**
 * Integration test simulasi risiko (D-041) terhadap database asli; push di-mock.
 * Simulasi memakai nilai hujan yang melewati ambang asli, bukan menurunkan ambang.
 * Jalankan: npm run test:integration
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { HasilKirimPush, PayloadPush } from "@/server/integrations/web-push";
import { buatRespons } from "../fixtures/open-meteo";

const kirimPushMock = vi.fn<(sub: unknown, payload: PayloadPush) => Promise<HasilKirimPush>>();
vi.mock("@/server/integrations/web-push", () => ({
  kirimPush: (sub: unknown, payload: PayloadPush) => kirimPushMock(sub, payload),
  pushTersedia: () => true,
}));
vi.mock("next/server", () => ({ after: () => undefined }));

const { db } = await import("@/server/db");
const { risikoDesa, tindakLanjutRisiko } = await import("@/server/services/pemantauan.service");
const { prosesPeringatan } = await import("@/server/services/notification.service");
const { AWALAN_JUDUL_RIWAYAT } = await import("@/server/services/riwayat.service");
const { aktifkan, daftarkanPerangkat } = await import("@/server/services/subscription.service");

const KECAMATAN = "13.71.05"; // Kec. Bungus Teluk Kabung, Kota Padang
const DESA = "13.71.05.1002"; // Kelurahan Bungus Barat
const penggunaDibuat: string[] = [];
const cuacaDibuat: string[] = [];

// Hujan asli kecil: 0,1 mm/jam → ±2,4 mm/24 jam (RENDAH menurut ambang global).
const raw = buatRespons({ currentTime: "2026-09-25T13:00", hujanPerJam: () => 0.1, hujanHarian: [1, 1, 2, 2, 2] });

async function buatCuaca() {
  const dataCuaca = await db.dataCuaca.create({
    data: {
      kunciGrid: "0.0,0.0", // sel di laut, tidak tercampur cache nyata
      gridLatitude: 0,
      gridLongitude: 0,
      curahHujan: 0,
      suhu: 28,
      kelembapan: 80,
      kondisiCuaca: 61,
      kecepatanAngin: 5,
      waktuPengamatan: new Date(),
      waktuAmbil: new Date(Date.now() - 25 * 60 * 60 * 1000),
      rawJson: raw,
    },
  });
  cuacaDibuat.push(dataCuaca.idCuaca);
  return { dataCuaca, raw };
}

async function buatLangganan() {
  const deviceToken = randomUUID();
  const idPerangkat = await daftarkanPerangkat({ deviceToken, jenisPerangkat: "mobile", browser: "Chrome", idWilayah: DESA });
  penggunaDibuat.push((await db.perangkat.findUniqueOrThrow({ where: { idPerangkat } })).idPengguna);
  return aktifkan(idPerangkat, {
    idWilayah: DESA,
    levelMinimum: "SEDANG",
    subscription: {
      endpoint: `https://fcm.googleapis.com/fcm/send/uji-simulasi-${deviceToken}`,
      keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u", auth: "tBHItJI5svbpez7KI4CCXg" },
    },
  });
}

const ambangSnapshot = () => db.ambangRisiko.findMany({ orderBy: { idAmbang: "asc" } });
const riwayatPadang = () =>
  db.informasi.count({ where: { idWilayah: "13.71", judul: { startsWith: AWALAN_JUDUL_RIWAYAT }, tanggal: { gte: new Date(Date.now() - 60_000) } } });

beforeEach(() => {
  kirimPushMock.mockReset();
  kirimPushMock.mockResolvedValue({ ok: true });
});

afterAll(async () => {
  await db.simulasiCuaca.deleteMany({ where: { idWilayah: KECAMATAN } });
  await db.dataCuaca.deleteMany({ where: { idCuaca: { in: cuacaDibuat } } });
  await db.pengguna.deleteMany({ where: { idPengguna: { in: penggunaDibuat } } });
  await db.$disconnect();
});

describe("simulasi hujan (ambang asli, notifikasi berlabel, tanpa riwayat)", () => {
  it("aktif → TINGGI dari nilai hujan simulasi; ambang tidak berubah; push [SIMULASI]; riwayat tidak ditulis; pulihkan → risiko asli", async () => {
    await db.langgananNotifikasi.updateMany({ where: { idWilayah: DESA }, data: { status: false } });
    await buatLangganan();
    const cuaca = await buatCuaca();
    const ambangSebelum = await ambangSnapshot();
    const riwayatSebelum = await riwayatPadang();

    const asli = await risikoDesa(DESA, cuaca);
    expect(asli.risiko).toMatchObject({ level: "RENDAH", simulasi: false });

    // Simulasi di tingkat kecamatan berlaku untuk desa di bawahnya, tanpa request cuaca baru.
    await db.simulasiCuaca.create({ data: { idWilayah: KECAMATAN, hujan24Jam: 60, levelTujuan: "TINGGI" } });
    const sim = await risikoDesa(DESA, cuaca);
    if (!sim.risikoBaru) throw new Error("risiko simulasi seharusnya baru dihitung");
    expect(sim.risiko).toMatchObject({ level: "TINGGI", simulasi: true, idCuaca: cuaca.dataCuaca.idCuaca });
    expect(sim.risiko.deskripsi).toBe("[SIMULASI] Risiko TINGGI karena curah hujan 24 jam terakhir 60 mm.");
    expect(await ambangSnapshot()).toEqual(ambangSebelum);

    const hasil = await tindakLanjutRisiko(sim.risikoBaru);
    expect(hasil).toMatchObject({ notifikasi: { terkirim: 1 }, riwayat: false });
    expect(kirimPushMock.mock.calls[0]?.[1].judul).toMatch(/^\[SIMULASI\] ⚠️ Risiko banjir TINGGI di Kelurahan Bungus Barat/);
    expect(await riwayatPadang()).toBe(riwayatSebelum);

    // Dipanggil lagi selama simulasi aktif → memakai risiko simulasi yang sama.
    expect((await risikoDesa(DESA, cuaca)).risikoBaru).toBeNull();

    // Pulihkan (seperti `npm run simulasi -- pulihkan`): risiko asli dipakai lagi.
    await db.$transaction([
      db.levelRisiko.deleteMany({ where: { simulasi: true, idWilayah: { startsWith: `${KECAMATAN}.` } } }),
      db.simulasiCuaca.delete({ where: { idWilayah: KECAMATAN } }),
    ]);
    const pulih = await risikoDesa(DESA, cuaca);
    expect(pulih.risikoBaru).toBeNull();
    expect(pulih.risiko).toMatchObject({ idRisiko: asli.risiko.idRisiko, level: "RENDAH", simulasi: false });
  });

  it("notifikasi simulasi tidak menahan peringatan asli (anti-spam terpisah)", async () => {
    await db.langgananNotifikasi.updateMany({ where: { idWilayah: DESA }, data: { status: false } });
    await buatLangganan();
    const { dataCuaca } = await buatCuaca();
    const risiko = (simulasi: boolean) =>
      db.levelRisiko.create({
        data: {
          idWilayah: DESA,
          idCuaca: dataCuaca.idCuaca,
          level: "TINGGI",
          skorRisiko: 80,
          deskripsi: `${simulasi ? "[SIMULASI] " : ""}Risiko TINGGI karena curah hujan 24 jam terakhir 60 mm.`,
          simulasi,
        },
      });

    expect((await prosesPeringatan(await risiko(true))).terkirim).toBe(1);
    // Peringatan asli TINGGI dalam 6 jam tetap terkirim.
    expect((await prosesPeringatan(await risiko(false))).terkirim).toBe(1);
    expect(kirimPushMock.mock.calls.map((c) => c[1].judul.startsWith("[SIMULASI]"))).toEqual([true, false]);
    // Simulasi kedua dalam 6 jam tetap dibatasi anti-spam simulasi.
    expect((await prosesPeringatan(await risiko(true))).dilewati).toBe(1);
  });
});
