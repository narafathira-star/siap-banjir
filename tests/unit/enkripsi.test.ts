import { afterEach, describe, expect, it, vi } from "vitest";
import { adalahAmplop, dekripsiJson, enkripsiJson, KunciEnkripsiError } from "@/server/enkripsi";

const KUNCI_A = "a1".repeat(32);
const KUNCI_B = "b2".repeat(32);
const SUBSCRIPTION = {
  endpoint: "https://fcm.googleapis.com/fcm/send/contoh-endpoint-rahasia",
  keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u", auth: "tBHItJI5svbpez7KI4CCXg" },
};

afterEach(() => vi.unstubAllEnvs());

describe("enkripsiJson / dekripsiJson", () => {
  it("round-trip: data kembali persis sama setelah didekripsi", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", KUNCI_A);
    expect(dekripsiJson(enkripsiJson(SUBSCRIPTION))).toEqual(SUBSCRIPTION);
  });

  it("hasil enkripsi tidak memuat endpoint maupun kunci dalam bentuk terbaca", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", KUNCI_A);
    const hasil = enkripsiJson(SUBSCRIPTION);
    expect(adalahAmplop(hasil)).toBe(true);
    const teks = JSON.stringify(hasil);
    expect(teks).not.toContain("fcm.googleapis.com");
    expect(teks).not.toContain(SUBSCRIPTION.keys.auth);
    expect(teks).not.toContain(SUBSCRIPTION.keys.p256dh);
  });

  it("IV acak: enkripsi data yang sama menghasilkan keluaran berbeda", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", KUNCI_A);
    expect(JSON.stringify(enkripsiJson(SUBSCRIPTION))).not.toBe(JSON.stringify(enkripsiJson(SUBSCRIPTION)));
  });

  it("kunci salah -> galat (bukan null)", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", KUNCI_A);
    const terenkripsi = enkripsiJson(SUBSCRIPTION);
    vi.stubEnv("DATA_ENCRYPTION_KEY", KUNCI_B);
    expect(() => dekripsiJson(terenkripsi)).toThrow(KunciEnkripsiError);
  });

  it("data yang diubah terdeteksi (integritas GCM)", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", KUNCI_A);
    const amplop = enkripsiJson(SUBSCRIPTION) as { data: string };
    const data = Buffer.from(amplop.data, "base64");
    data[0] = (data[0] ?? 0) ^ 0xff;
    expect(() => dekripsiJson({ ...amplop, data: data.toString("base64") })).toThrow(KunciEnkripsiError);
  });

  it("data lama yang masih polos tetap terbaca", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", KUNCI_A);
    expect(dekripsiJson(SUBSCRIPTION)).toEqual(SUBSCRIPTION);
  });

  it("tanpa kunci di non-produksi: data disimpan apa adanya (dev/test)", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", "");
    vi.stubEnv("NODE_ENV", "test");
    expect(enkripsiJson(SUBSCRIPTION)).toEqual(SUBSCRIPTION);
  });

  it("tanpa kunci di produksi: menolak (gagal aman)", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => enkripsiJson(SUBSCRIPTION)).toThrow(KunciEnkripsiError);
  });

  it("panjang kunci salah -> galat", () => {
    vi.stubEnv("DATA_ENCRYPTION_KEY", "terlalu-pendek");
    expect(() => enkripsiJson(SUBSCRIPTION)).toThrow(KunciEnkripsiError);
  });
});
