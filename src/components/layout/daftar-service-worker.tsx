"use client";

import { useEffect } from "react";
import { daftarkanServiceWorker } from "@/lib/push-client";

/** Aset JS/CSS yang sudah dimuat halaman ini (termasuk sebelum SW aktif). */
function asetTermuat() {
  return performance
    .getEntriesByType("resource")
    .map((e) => e.name)
    .filter((u) => u.startsWith(`${location.origin}/_next/static/`));
}

/** Daftarkan service worker (PWA offline + push) setelah halaman selesai dimuat. */
export function DaftarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const daftar = () => {
      daftarkanServiceWorker()
        .then((reg) => reg.active?.postMessage({ type: "CACHE_ASET", urls: asetTermuat() }))
        .catch((err: unknown) => console.error("[sw] Gagal mendaftar:", err));
    };
    if (document.readyState === "complete") daftar();
    else window.addEventListener("load", daftar, { once: true });
  }, []);
  return null;
}
