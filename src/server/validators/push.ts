import { z } from "zod";
import { queryWilayahSchema } from "@/server/validators/risiko";

/**
 * Server akan mengirim POST ke endpoint subscription, jadi endpoint dibatasi ke push
 * service resmi browser (mencegah SSRF ke alamat internal). Lihat DECISIONS D-018.
 */
const HOST_PUSH_SERVICE = [
  "fcm.googleapis.com", // Chrome, Edge Android, Opera, Samsung Internet
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com", // Safari (macOS & iOS PWA)
  ".notify.windows.com", // Edge desktop (WNS)
];

export function endpointDiizinkan(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "") return false;
  const host = url.hostname.toLowerCase();
  return HOST_PUSH_SERVICE.some((h) => (h.startsWith(".") ? host.endsWith(h) : host === h));
}

const base64Url = z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+=*$/, "harus base64url");

export const endpointSchema = z
  .string()
  .max(1024)
  .refine(endpointDiizinkan, "endpoint harus berasal dari push service browser yang dikenal");

export const pushSubscriptionSchema = z.object({
  endpoint: endpointSchema,
  expirationTime: z.number().nullish(),
  keys: z.object({ p256dh: base64Url, auth: base64Url }),
});

export type PushSubscriptionJson = z.infer<typeof pushSubscriptionSchema>;

/** Level minimum yang bisa dipilih pengguna: Sedang (Sedang + Tinggi) atau Tinggi saja. */
export const levelMinimumSchema = z.enum(["SEDANG", "TINGGI"]);

export const subscribeBodySchema = z.object({
  // Token acak per browser (crypto.randomUUID), disimpan di localStorage.
  deviceToken: z.uuid(),
  jenisPerangkat: z.enum(["mobile", "tablet", "desktop"]),
  browser: z.string().min(1).max(40),
  subscription: pushSubscriptionSchema,
  idWilayah: queryWilayahSchema.shape.wilayah,
  levelMinimum: levelMinimumSchema.default("SEDANG"),
});

export const endpointBodySchema = z.object({ endpoint: endpointSchema });

export const endpointQuerySchema = z.object({ endpoint: endpointSchema });
