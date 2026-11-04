"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { simpanWilayahLokal } from "@/lib/wilayah-preferensi";

/** aturLokasi(wilayah): simpan preferensi lalu render ulang halaman untuk wilayah itu. */
export function useWilayah() {
  const router = useRouter();
  const pathname = usePathname();

  const pilihWilayah = useCallback(
    (idWilayah: string) => {
      simpanWilayahLokal(idWilayah);
      router.replace(`${pathname}?wilayah=${encodeURIComponent(idWilayah)}`, { scroll: false });
    },
    [pathname, router],
  );

  return { pilihWilayah };
}
