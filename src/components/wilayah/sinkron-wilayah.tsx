"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { bacaCookieWilayah, bacaWilayahLokal, simpanWilayahLokal } from "@/lib/wilayah-preferensi";

/**
 * localStorage adalah sumber preferensi di browser. Jika cookie hilang/berbeda
 * (misal kedaluwarsa atau dihapus), salin ulang lalu render ulang halaman.
 */
export function SinkronWilayah() {
  const router = useRouter();
  useEffect(() => {
    const lokal = bacaWilayahLokal();
    if (lokal && bacaCookieWilayah() !== lokal) {
      simpanWilayahLokal(lokal);
      router.refresh();
    }
  }, [router]);
  return null;
}
