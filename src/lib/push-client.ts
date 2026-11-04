/** Utilitas Web Push di browser. Hanya dipanggil dari komponen klien. */
import { deteksiBrowser, deteksiJenisPerangkat } from "@/lib/perangkat";

const KUNCI_DEVICE = "siapbanjir_device";
const KUNCI_SUDAH_DITANYA = "siapbanjir_izin_ditanya";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function dukungPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Kunci VAPID base64url → Uint8Array untuk applicationServerKey. */
export function base64UrlKeUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const biner = atob((base64Url + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const hasil = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i++) hasil[i] = biner.charCodeAt(i);
  return hasil;
}

/** Token acak per browser (identitas perangkat tanpa login). */
export function ambilDeviceToken() {
  try {
    const ada = window.localStorage.getItem(KUNCI_DEVICE);
    if (ada) return ada;
    const baru = crypto.randomUUID();
    window.localStorage.setItem(KUNCI_DEVICE, baru);
    return baru;
  } catch {
    // localStorage diblokir: token sementara untuk sesi ini.
    return crypto.randomUUID();
  }
}

export function infoPerangkat() {
  const ua = navigator.userAgent;
  return { jenisPerangkat: deteksiJenisPerangkat(ua), browser: deteksiBrowser(ua) };
}

export function sudahDitanya() {
  try {
    return window.localStorage.getItem(KUNCI_SUDAH_DITANYA) === "1";
  } catch {
    return false;
  }
}

export function tandaiSudahDitanya() {
  try {
    window.localStorage.setItem(KUNCI_SUDAH_DITANYA, "1");
  } catch {
    // abaikan
  }
}

// Mode dev: SW tidak memakai cache agar hot reload tidak terganggu (lihat public/sw.js).
const URL_SW = process.env.NODE_ENV === "development" ? "/sw.js?dev=1" : "/sw.js";

export async function daftarkanServiceWorker() {
  await navigator.serviceWorker.register(URL_SW, { scope: "/" });
  return navigator.serviceWorker.ready;
}

/** POST JSON; lempar Error berisi pesan dari server jika gagal. */
export async function kirimJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const pesan =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : `Permintaan gagal (HTTP ${res.status})`;
    throw new GalatApi(pesan, res.status);
  }
  return json as T;
}

export class GalatApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GalatApi";
  }
}
