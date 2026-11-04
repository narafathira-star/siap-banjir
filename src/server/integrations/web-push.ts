/**
 * Pengiriman Web Push (VAPID). Private key hanya dibaca dari env server.
 */
import webpush, { WebPushError } from "web-push";
import type { PushSubscriptionJson } from "@/server/validators/push";

export class PushBelumDikonfigurasiError extends Error {
  constructor() {
    super("VAPID key belum diatur (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)");
    this.name = "PushBelumDikonfigurasiError";
  }
}

let sudahDikonfigurasi = false;

function konfigurasi() {
  if (sudahDikonfigurasi) return;
  const publik = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privat = process.env.VAPID_PRIVATE_KEY;
  if (!publik || !privat) throw new PushBelumDikonfigurasiError();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", publik, privat);
  sudahDikonfigurasi = true;
}

export function pushTersedia() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PayloadPush = {
  judul: string;
  pesan: string;
  url: string;
  tag: string;
  level?: "RENDAH" | "SEDANG" | "TINGGI";
};

export type HasilKirimPush =
  | { ok: true }
  /** kedaluwarsa = push service membalas 404/410; subscription harus dihapus. */
  | { ok: false; kedaluwarsa: boolean; status?: number; pesan: string };

export async function kirimPush(
  subscription: PushSubscriptionJson,
  payload: PayloadPush,
  opsi: { urgensi?: "normal" | "high"; ttlDetik?: number } = {},
): Promise<HasilKirimPush> {
  konfigurasi();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
      { TTL: opsi.ttlDetik ?? 6 * 60 * 60, urgency: opsi.urgensi ?? "normal", timeout: 10_000 },
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof WebPushError) {
      return {
        ok: false,
        kedaluwarsa: err.statusCode === 404 || err.statusCode === 410,
        status: err.statusCode,
        pesan: err.body || err.message,
      };
    }
    return { ok: false, kedaluwarsa: false, pesan: err instanceof Error ? err.message : String(err) };
  }
}
