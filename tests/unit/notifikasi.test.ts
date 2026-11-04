import { describe, expect, it } from "vitest";
import { buatRateLimiter } from "@/lib/rate-limit";
import { deteksiBrowser, deteksiJenisPerangkat } from "@/lib/perangkat";
import { base64UrlKeUint8Array } from "@/lib/push-client";
import { buatNotifikasi, perluKirim } from "@/server/services/notification.service";
import { memenuhiLevelMinimum } from "@/server/services/subscription.service";
import { endpointDiizinkan, subscribeBodySchema } from "@/server/validators/push";

describe("anti-spam perluKirim", () => {
  it("kirim jika belum ada notifikasi dalam 6 jam", () => {
    expect(perluKirim("SEDANG", [])).toBe(true);
    expect(perluKirim("TINGGI", [])).toBe(true);
  });

  it("tidak kirim ulang level yang sama", () => {
    expect(perluKirim("SEDANG", ["SEDANG"])).toBe(false);
    expect(perluKirim("TINGGI", ["TINGGI"])).toBe(false);
  });

  it("kirim jika level naik Sedang → Tinggi", () => {
    expect(perluKirim("TINGGI", ["SEDANG"])).toBe(true);
  });

  it("tidak kirim jika level turun (sudah dapat Tinggi, kini Sedang)", () => {
    expect(perluKirim("SEDANG", ["TINGGI"])).toBe(false);
    expect(perluKirim("SEDANG", ["SEDANG", "TINGGI"])).toBe(false);
  });

  it("RENDAH tidak pernah dikirim", () => {
    expect(perluKirim("RENDAH", [])).toBe(false);
  });
});

describe("memenuhiLevelMinimum", () => {
  it("minimum SEDANG menerima Sedang & Tinggi", () => {
    expect(memenuhiLevelMinimum("SEDANG", "SEDANG")).toBe(true);
    expect(memenuhiLevelMinimum("TINGGI", "SEDANG")).toBe(true);
    expect(memenuhiLevelMinimum("RENDAH", "SEDANG")).toBe(false);
  });

  it("minimum TINGGI hanya menerima Tinggi", () => {
    expect(memenuhiLevelMinimum("SEDANG", "TINGGI")).toBe(false);
    expect(memenuhiLevelMinimum("TINGGI", "TINGGI")).toBe(true);
  });
});

describe("buatNotifikasi", () => {
  it("pesan memuat jam penilaian dalam zona wilayah: WIB, WITA, WIT (D-060)", () => {
    const waktu = new Date("2026-09-25T06:05:00Z");
    const dasar = { level: "SEDANG" as const, deskripsi: "Risiko SEDANG karena curah hujan 24 jam terakhir 30 mm.", simulasi: false, waktu };
    expect(buatNotifikasi({ ...dasar, idWilayah: "33.74.02.1002" }, "Kelurahan Bulu Lor, Kota Semarang").pesan).toMatch(
      /^Pukul 13:05 WIB: Risiko SEDANG/,
    );
    expect(buatNotifikasi({ ...dasar, idWilayah: "51.71.01.1001" }, "Kelurahan Serangan, Kota Denpasar").pesan).toMatch(
      /^Pukul 14:05 WITA: Risiko SEDANG/,
    );
    expect(buatNotifikasi({ ...dasar, idWilayah: "82.71.01.1001" }, "Kelurahan Jambula, Kota Ternate").pesan).toMatch(
      /^Pukul 15:05 WIT: Risiko SEDANG/,
    );
  });

  it("berisi deep link ke /risiko?wilayah={id} bagian Detail Penanganan", () => {
    const p = buatNotifikasi(
      {
        idWilayah: "33.74.02.1002",
        level: "TINGGI",
        deskripsi: "Risiko TINGGI karena curah hujan 24 jam terakhir 72 mm.",
        simulasi: false,
        waktu: new Date("2026-09-25T06:05:00Z"),
      },
      "Kelurahan Bulu Lor, Kota Semarang",
    );
    expect(p.url).toBe("/risiko?wilayah=33.74.02.1002#penanganan");
    expect(p.judul).toContain("TINGGI");
    expect(p.judul).toContain("Kelurahan Bulu Lor, Kota Semarang");
    expect(p.judul).not.toContain("SIMULASI");
    expect(p.tag).toBe("risiko-33.74.02.1002");
  });

  it("risiko simulasi: judul diawali [SIMULASI], isi menjelaskan simulasi, tag terpisah dari peringatan asli", () => {
    const p = buatNotifikasi(
      {
        idWilayah: "34.04.12.2001",
        level: "TINGGI",
        deskripsi: "[SIMULASI] Risiko TINGGI karena curah hujan 24 jam terakhir 60 mm.",
        simulasi: true,
        waktu: new Date("2026-09-25T06:05:00Z"),
      },
      "Desa Sariharjo, Kabupaten Sleman",
    );
    expect(p.judul).toBe("[SIMULASI] ⚠️ Risiko banjir TINGGI di Desa Sariharjo, Kabupaten Sleman");
    expect(p.pesan).toBe(
      "Pukul 13:05 WIB: Risiko TINGGI karena curah hujan 24 jam terakhir 60 mm. Ini simulasi uji, bukan kondisi cuaca sebenarnya.",
    );
    expect(p.tag).toBe("simulasi-risiko-34.04.12.2001");
  });
});

describe("validasi endpoint push (anti-SSRF)", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/QGx",
    "https://wns2-sg2p.notify.windows.com/w/?token=abc",
  ])("mengizinkan %s", (url) => expect(endpointDiizinkan(url)).toBe(true));

  it.each([
    "http://fcm.googleapis.com/fcm/send/abc",
    "https://localhost/push",
    "https://127.0.0.1/push",
    "https://169.254.169.254/latest/meta-data",
    "https://fcm.googleapis.com.evil.com/x",
    "https://evilnotify.windows.com.attacker.io/x",
    "https://fcm.googleapis.com:8443/x",
    "bukan url",
  ])("menolak %s", (url) => expect(endpointDiizinkan(url)).toBe(false));

  it("body subscribe valid lolos; levelMinimum RENDAH ditolak", () => {
    const body = {
      deviceToken: "3f1c2a4e-8b7d-4c6a-9e5f-1a2b3c4d5e6f",
      jenisPerangkat: "mobile",
      browser: "Chrome",
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
        keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u", auth: "tBHItJI5svbpez7KI4CCXg" },
      },
      idWilayah: "33.74.02.1002",
    };
    expect(subscribeBodySchema.parse(body).levelMinimum).toBe("SEDANG");
    expect(subscribeBodySchema.safeParse({ ...body, levelMinimum: "RENDAH" }).success).toBe(false);
    // Slug lama / kode tidak valid ditolak.
    expect(subscribeBodySchema.safeParse({ ...body, idWilayah: "kota-semarang" }).success).toBe(false);
  });
});

describe("rate limit", () => {
  it("menolak setelah melewati batas lalu reset setelah jendela berakhir", () => {
    const cek = buatRateLimiter({ maks: 2, jendelaMs: 1000 });
    expect(cek("ip", 0).ok).toBe(true);
    expect(cek("ip", 10).ok).toBe(true);
    const ditolak = cek("ip", 20);
    expect(ditolak.ok).toBe(false);
    expect(ditolak.retryAfterDetik).toBe(1);
    expect(cek("ip-lain", 20).ok).toBe(true);
    expect(cek("ip", 1001).ok).toBe(true);
  });
});

describe("deteksi perangkat", () => {
  const ANDROID_CHROME =
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
  const WIN_EDGE =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0";
  const IPHONE_SAFARI =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

  it("mengenali jenis & browser", () => {
    expect([deteksiJenisPerangkat(ANDROID_CHROME), deteksiBrowser(ANDROID_CHROME)]).toEqual(["mobile", "Chrome"]);
    expect([deteksiJenisPerangkat(WIN_EDGE), deteksiBrowser(WIN_EDGE)]).toEqual(["desktop", "Edge"]);
    expect([deteksiJenisPerangkat(IPHONE_SAFARI), deteksiBrowser(IPHONE_SAFARI)]).toEqual(["mobile", "Safari"]);
  });
});

describe("base64UrlKeUint8Array", () => {
  it("mengonversi VAPID public key (65 byte, diawali 0x04)", () => {
    const k = base64UrlKeUint8Array(
      "BASKWtr4T6zAy7aFDgEGjFU2JiDn2CDttPK3upDfppdcoifTtQb2IY_d4cVrmma6pn7xf9ohnZHL3QJn9_zmo28",
    );
    expect(k.length).toBe(65);
    expect(k[0]).toBe(4);
  });
});
