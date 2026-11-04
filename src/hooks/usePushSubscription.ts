"use client";

import { useCallback, useEffect, useState } from "react";
import {
  VAPID_PUBLIC_KEY,
  GalatApi,
  ambilDeviceToken,
  base64UrlKeUint8Array,
  daftarkanServiceWorker,
  dukungPush,
  infoPerangkat,
  kirimJson,
} from "@/lib/push-client";

export type StatusPush =
  | "memuat"
  | "tidak-didukung"
  | "belum-dikonfigurasi"
  | "ditolak"
  | "belum-aktif"
  | "aktif"
  | "nonaktif";

export type LevelMinimum = "SEDANG" | "TINGGI";

export type InfoLangganan = { idWilayah: string; levelMinimum: LevelMinimum; status: boolean };

async function subscriptionSaatIni() {
  const reg = await daftarkanServiceWorker();
  return reg.pushManager.getSubscription();
}

/** Status & aksi Web Push untuk perangkat ini. Dipakai lewat NotifikasiProvider. */
export function usePushSubscription() {
  const [status, setStatus] = useState<StatusPush>("memuat");
  const [langganan, setLangganan] = useState<InfoLangganan | null>(null);

  const muat = useCallback(async () => {
    if (!dukungPush()) return setStatus("tidak-didukung");
    if (!VAPID_PUBLIC_KEY) return setStatus("belum-dikonfigurasi");
    try {
      const sub = await subscriptionSaatIni();
      if (Notification.permission === "denied") return setStatus("ditolak");
      if (!sub) return setStatus("belum-aktif");

      const res = await fetch(`/api/push/langganan?endpoint=${encodeURIComponent(sub.endpoint)}`);
      if (!res.ok) return setStatus("belum-aktif");
      const { data } = (await res.json()) as { data: InfoLangganan };
      setLangganan(data);
      setStatus(data.status ? "aktif" : "nonaktif");
    } catch (err) {
      console.error("[push] Gagal memuat status:", err);
      setStatus("belum-aktif");
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const simpan = useCallback(async (sub: PushSubscription, idWilayah: string, levelMinimum: LevelMinimum) => {
    const { data } = await kirimJson<{ data: InfoLangganan }>("/api/push/subscribe", {
      deviceToken: ambilDeviceToken(),
      ...infoPerangkat(),
      subscription: sub.toJSON(),
      idWilayah,
      levelMinimum,
    });
    setLangganan(data);
    setStatus("aktif");
  }, []);

  /**
   * Minta izin browser (jika belum), buat subscription, lalu daftarkan perangkat.
   * Mengembalikan false jika pengguna menolak izin.
   */
  const aktifkan = useCallback(
    async (idWilayah: string, levelMinimum: LevelMinimum = "SEDANG") => {
      if (!dukungPush()) throw new Error("Browser ini tidak mendukung notifikasi push.");
      if (!VAPID_PUBLIC_KEY) throw new Error("Notifikasi push belum dikonfigurasi di server.");

      const izin = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (izin !== "granted") {
        setStatus(izin === "denied" ? "ditolak" : "belum-aktif");
        return false;
      }

      const reg = await daftarkanServiceWorker();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlKeUint8Array(VAPID_PUBLIC_KEY),
        }));
      await simpan(sub, idWilayah, levelMinimum);
      return true;
    },
    [simpan],
  );

  /** Perbarui wilayah / level minimum langganan yang sedang aktif. */
  const perbarui = useCallback(
    async (ubah: { idWilayah?: string; levelMinimum?: LevelMinimum }) => {
      const sub = await subscriptionSaatIni();
      if (!sub || !langganan) throw new Error("Notifikasi belum aktif di perangkat ini.");
      await simpan(sub, ubah.idWilayah ?? langganan.idWilayah, ubah.levelMinimum ?? langganan.levelMinimum);
    },
    [langganan, simpan],
  );

  const nonaktifkan = useCallback(async () => {
    const sub = await subscriptionSaatIni();
    if (!sub) return setStatus("belum-aktif");
    await kirimJson("/api/push/unsubscribe", { endpoint: sub.endpoint });
    setLangganan((l) => (l ? { ...l, status: false } : l));
    setStatus("nonaktif");
  }, []);

  const kirimUji = useCallback(async () => {
    const sub = await subscriptionSaatIni();
    if (!sub) throw new Error("Notifikasi belum aktif di perangkat ini.");
    try {
      await kirimJson("/api/push/test", { endpoint: sub.endpoint });
    } catch (err) {
      // 404/410: server tidak lagi mengenal subscription ini.
      if (err instanceof GalatApi && (err.status === 404 || err.status === 410)) {
        setLangganan(null);
        setStatus("belum-aktif");
      }
      throw err;
    }
  }, []);

  return { status, langganan, aktifkan, perbarui, nonaktifkan, kirimUji };
}
