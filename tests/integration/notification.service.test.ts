/**
 * Integration test prosesPeringatan() terhadap database asli.
 * Push service di-mock; data uji dibuat sendiri dan dihapus lagi.
 * Jalankan: npm run test:integration (butuh PostgreSQL + migrasi + seed).
 */
import { randomUUID } from "node:crypto";
import type { TingkatRisiko } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { HasilKirimPush } from "@/server/integrations/web-push";

const kirimPushMock = vi.fn<(...args: unknown[]) => Promise<HasilKirimPush>>();
vi.mock("@/server/integrations/web-push", () => ({
  kirimPush: (...args: unknown[]) => kirimPushMock(...args),
  pushTersedia: () => true,
}));

const { db } = await import("@/server/db");
const { prosesPeringatan } = await import("@/server/services/notification.service");
const { aktifkan, daftarkanPerangkat } = await import("@/server/services/subscription.service");

const WILAYAH = "33.75.03.1009"; // Kelurahan Bandengan, Kota Pekalongan
const penggunaDibuat: string[] = [];
const cuacaDibuat: string[] = [];

async function buatLangganan(opsi: { levelMinimum?: TingkatRisiko; status?: boolean } = {}) {
  const deviceToken = randomUUID();
  const idPerangkat = await daftarkanPerangkat({
    deviceToken,
    jenisPerangkat: "mobile",
    browser: "Chrome",
    idWilayah: WILAYAH,
  });
  const perangkat = await db.perangkat.findUniqueOrThrow({ where: { idPerangkat } });
  penggunaDibuat.push(perangkat.idPengguna);
  const langganan = await aktifkan(idPerangkat, {
    idWilayah: WILAYAH,
    levelMinimum: opsi.levelMinimum ?? "SEDANG",
    subscription: {
      endpoint: `https://fcm.googleapis.com/fcm/send/uji-${deviceToken}`,
      keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u", auth: "tBHItJI5svbpez7KI4CCXg" },
    },
  });
  if (opsi.status === false) await db.langgananNotifikasi.update({ where: { idLangganan: langganan.idLangganan }, data: { status: false } });
  return langganan;
}

async function buatRisiko(level: TingkatRisiko) {
  const cuaca = await db.dataCuaca.create({
    data: {
      // Sel grid di laut (tanpa desa) agar tidak tercampur cache cuaca nyata.
      kunciGrid: "0.0,0.0",
      gridLatitude: 0,
      gridLongitude: 0,
      curahHujan: 0,
      suhu: 28,
      kelembapan: 80,
      kondisiCuaca: 63,
      kecepatanAngin: 5,
      waktuPengamatan: new Date(),
      // Tandai sebagai data uji; di luar jendela hitung kuota 24 jam.
      waktuAmbil: new Date(Date.now() - 25 * 60 * 60 * 1000),
      rawJson: { uji: true },
    },
  });
  cuacaDibuat.push(cuaca.idCuaca);
  return db.levelRisiko.create({
    data: { idWilayah: WILAYAH, idCuaca: cuaca.idCuaca, level, skorRisiko: level === "TINGGI" ? 80 : 50, deskripsi: `Uji ${level}` },
  });
}

const statusNotifikasi = (idLangganan: string) =>
  db.notifikasi.findMany({ where: { idLangganan }, include: { levelRisiko: true }, orderBy: { waktuKirim: "asc" } });

beforeAll(async () => {
  // Langganan lain di wilayah uji (misal dari uji manual) tidak boleh ikut dihitung.
  await db.langgananNotifikasi.updateMany({ where: { idWilayah: WILAYAH }, data: { status: false } });
});

beforeEach(() => {
  kirimPushMock.mockReset();
  kirimPushMock.mockResolvedValue({ ok: true });
});

afterAll(async () => {
  await db.dataCuaca.deleteMany({ where: { idCuaca: { in: cuacaDibuat } } });
  await db.pengguna.deleteMany({ where: { idPengguna: { in: penggunaDibuat } } });
  await db.$disconnect();
});

describe("prosesPeringatan (DB asli, push di-mock)", () => {
  it("level RENDAH → tidak ada notifikasi", async () => {
    await buatLangganan();
    const hasil = await prosesPeringatan(await buatRisiko("RENDAH"));
    expect(hasil).toEqual({ terkirim: 0, gagal: 0, dihapus: 0, dilewati: 0 });
    expect(kirimPushMock).not.toHaveBeenCalled();
  });

  it("anti-spam 6 jam: Sedang terkirim, Sedang lagi dilewati, naik ke Tinggi terkirim, Tinggi lagi dilewati", async () => {
    await db.langgananNotifikasi.updateMany({ where: { idWilayah: WILAYAH }, data: { status: false } });
    const l = await buatLangganan();

    expect((await prosesPeringatan(await buatRisiko("SEDANG"))).terkirim).toBe(1);
    expect((await prosesPeringatan(await buatRisiko("SEDANG"))).dilewati).toBe(1);
    expect((await prosesPeringatan(await buatRisiko("TINGGI"))).terkirim).toBe(1);
    expect((await prosesPeringatan(await buatRisiko("TINGGI"))).dilewati).toBe(1);

    const catatan = await statusNotifikasi(l.idLangganan);
    expect(catatan.map((n) => [n.levelRisiko.level, n.statusKirim])).toEqual([
      ["SEDANG", "TERKIRIM"],
      ["TINGGI", "TERKIRIM"],
    ]);
    // Payload berisi deep link ke detail risiko wilayah.
    expect(kirimPushMock.mock.calls[0]?.[1]).toMatchObject({ url: `/risiko?wilayah=${WILAYAH}#penanganan` });
  });

  it("levelMinimum TINGGI tidak menerima Sedang; status nonaktif tidak menerima apa pun", async () => {
    await db.langgananNotifikasi.updateMany({ where: { idWilayah: WILAYAH }, data: { status: false } });
    const hanyaTinggi = await buatLangganan({ levelMinimum: "TINGGI" });
    await buatLangganan({ status: false });

    expect(await prosesPeringatan(await buatRisiko("SEDANG"))).toEqual({ terkirim: 0, gagal: 0, dihapus: 0, dilewati: 0 });
    const hasil = await prosesPeringatan(await buatRisiko("TINGGI"));
    expect(hasil.terkirim).toBe(1);
    expect((await statusNotifikasi(hanyaTinggi.idLangganan)).map((n) => n.levelRisiko.level)).toEqual(["TINGGI"]);
  });

  it("push service 404/410 → langganan dihapus; galat lain → statusKirim GAGAL", async () => {
    await db.langgananNotifikasi.updateMany({ where: { idWilayah: WILAYAH }, data: { status: false } });
    const kedaluwarsa = await buatLangganan();
    const bermasalah = await buatLangganan();

    kirimPushMock.mockImplementation(async (sub) => {
      const endpoint = (sub as { endpoint: string }).endpoint;
      return endpoint === kedaluwarsa.pushEndpoint
        ? { ok: false, kedaluwarsa: true, status: 410, pesan: "Gone" }
        : { ok: false, kedaluwarsa: false, status: 500, pesan: "Server error" };
    });

    const hasil = await prosesPeringatan(await buatRisiko("TINGGI"));
    expect(hasil).toMatchObject({ dihapus: 1, gagal: 1 });
    expect(await db.langgananNotifikasi.findUnique({ where: { idLangganan: kedaluwarsa.idLangganan } })).toBeNull();
    expect((await statusNotifikasi(bermasalah.idLangganan))[0]?.statusKirim).toBe("GAGAL");
  });

  it("notifikasi GAGAL tidak menghalangi percobaan berikutnya (anti-spam hanya menghitung yang terkirim)", async () => {
    await db.langgananNotifikasi.updateMany({ where: { idWilayah: WILAYAH }, data: { status: false } });
    await buatLangganan();
    kirimPushMock.mockResolvedValueOnce({ ok: false, kedaluwarsa: false, status: 503, pesan: "Unavailable" });
    expect((await prosesPeringatan(await buatRisiko("SEDANG"))).gagal).toBe(1);
    expect((await prosesPeringatan(await buatRisiko("SEDANG"))).terkirim).toBe(1);
  });
});
