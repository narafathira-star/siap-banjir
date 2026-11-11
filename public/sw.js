/* Service worker Siap Banjir: Web Push + cache offline (PWA).
 *
 * Strategi cache:
 *  - Precache: halaman /offline, manifest, ikon.
 *  - Navigasi halaman: network-first; salinan terakhir disimpan, dipakai saat offline;
 *    jika belum pernah dibuka → /offline.
 *  - /_next/static/*: cache-first (nama file berisi hash, tidak pernah berubah).
 *  - API & lainnya: tidak di-cache oleh SW (data risiko harus segar).
 * Mode pengembangan (sw.js?dev=1) tidak memakai cache agar hot reload tidak terganggu.
 * Halooo
 */

const VERSI = "v1";
const CACHE_STATIS = `siapbanjir-statis-${VERSI}`;
const CACHE_HALAMAN = `siapbanjir-halaman-${VERSI}`;
const MAKS_HALAMAN = 30;
const MODE_DEV = new URL(self.location.href).searchParams.get("dev") === "1";

const PRECACHE = [
  "/offline",
  "/manifest.json",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/badge-72.png",
];

// Path chunk bisa mengandung route group "(public)", jadi tanda kurung tidak boleh jadi pemisah.
const POLA_ASET = /\/_next\/static\/[^"'\s\\<>]+/g;

/** Precache halaman /offline beserta semua aset JS/CSS yang dirujuknya (agar bisa hydrate offline). */
async function precache() {
  const cache = await caches.open(CACHE_STATIS);
  await cache.addAll(PRECACHE);
  const html = await (await cache.match("/offline")).text();
  const aset = [...new Set(html.match(POLA_ASET) ?? [])];
  await Promise.all(aset.map((u) => cache.add(u).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((MODE_DEV ? Promise.resolve() : precache()).then(() => self.skipWaiting()));
});

// Aset yang dimuat halaman sebelum SW aktif (kunjungan pertama) dikirim dari halaman.
self.addEventListener("message", (event) => {
  if (MODE_DEV || event.data?.type !== "CACHE_ASET" || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter(
    (u) => typeof u === "string" && new URL(u, self.location.origin).origin === self.location.origin && u.includes("/_next/static/"),
  );
  event.waitUntil(
    caches.open(CACHE_STATIS).then((cache) =>
      Promise.all(
        urls.map(async (u) => {
          if (!(await cache.match(u))) await cache.add(u).catch(() => undefined);
        }),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((kunci) =>
        Promise.all(
          kunci
            .filter((k) => k.startsWith("siapbanjir-") && (MODE_DEV || (k !== CACHE_STATIS && k !== CACHE_HALAMAN)))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function batasiCache(nama, maks) {
  const cache = await caches.open(nama);
  const kunci = await cache.keys();
  for (const k of kunci.slice(0, Math.max(0, kunci.length - maks))) await cache.delete(k);
}

async function navigasi(request) {
  try {
    const respons = await fetch(request);
    if (respons.ok && respons.type === "basic") {
      const salinan = respons.clone();
      caches
        .open(CACHE_HALAMAN)
        .then((c) => c.put(request, salinan))
        .then(() => batasiCache(CACHE_HALAMAN, MAKS_HALAMAN));
    }
    return respons;
  } catch {
    const tersimpan = await caches.match(request, { ignoreVary: true });
    return tersimpan || (await caches.match("/offline")) || Response.error();
  }
}

async function cacheDulu(request) {
  const tersimpan = await caches.match(request);
  if (tersimpan) return tersimpan;
  const respons = await fetch(request);
  if (respons.ok) {
    const salinan = respons.clone();
    caches.open(CACHE_STATIS).then((c) => c.put(request, salinan));
  }
  return respons;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (MODE_DEV || request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigasi(request));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheDulu(request));
  }
});

// ---------- Web Push ----------

self.addEventListener("push", (event) => {
  /** @type {{ judul?: string, pesan?: string, url?: string, tag?: string, level?: string }} */
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { pesan: event.data.text() };
    }
  }

  const judul = data.judul || "Siap Banjir";
  event.waitUntil(
    self.registration.showNotification(judul, {
      body: data.pesan || "Ada pembaruan risiko banjir di wilayah Anda.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: data.tag || "siap-banjir",
      renotify: Boolean(data.tag),
      // Risiko TINGGI tetap tampil sampai pengguna menanggapinya.
      requireInteraction: data.level === "TINGGI",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const tujuan = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((jendela) => {
      for (const klien of jendela) {
        if (new URL(klien.url).origin === self.location.origin && "focus" in klien) {
          return klien.navigate(tujuan).then((k) => (k ? k.focus() : self.clients.openWindow(tujuan)));
        }
      }
      return self.clients.openWindow(tujuan);
    }),
  );
});
