"use client";

import { useEffect } from "react";
import { useNotifikasi } from "@/components/notifikasi/notifikasi-provider";

/**
 * Diletakkan di dalam <Suspense> yang sama dengan isi wilayah: ter-mount saat isi itu tampil,
 * sehingga dialog izin notifikasi baru dibuka setelah pengguna melihat hasil pilihannya (D-049).
 */
export function TandaKontenWilayah({ idWilayah }: { idWilayah: string }) {
  const { kontenTampil } = useNotifikasi();
  useEffect(() => {
    kontenTampil(idWilayah);
    return () => kontenTampil(null);
  }, [idWilayah, kontenTampil]);
  return null;
}
