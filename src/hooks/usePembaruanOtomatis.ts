"use client";

import { useCallback, useEffect, useRef } from "react";

export const INTERVAL_PEMBARUAN_MS = 30 * 60 * 1000;

/**
 * Pembaruan otomatis data wilayah (D-056): jalankan `perbarui` 30 menit setelah pembaruan terakhir,
 * dan saat pengguna kembali ke tab/aplikasi (`visibilitychange`, `pageshow`, `focus`) bila data di
 * perangkat sudah 30 menit atau lebih. Timer browser sering berhenti saat HP terkunci atau tab di
 * latar belakang, jadi umur data dihitung dengan jam dinding (`Date.now()`), bukan dari timer.
 *
 * `perbarui` harus mengambil data lewat `ambilDataWilayah()` dan menerapkannya ke state,
 * bukan `router.refresh()` (tidak andal di Next.js 15.5, D-055).
 * Mengembalikan fungsi pembaruan manual (tombol Perbarui) yang ikut mengatur ulang jadwal;
 * `perbarui` menerima `manual: true` untuk itu (D-057: hanya tombol yang meminta data Open-Meteo baru).
 */
export function usePembaruanOtomatis(perbarui: (opsi: { manual: boolean }) => Promise<void>) {
  const perbaruiTerkini = useRef(perbarui);
  const jalankanRef = useRef<(manual: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    perbaruiTerkini.current = perbarui;
  });

  useEffect(() => {
    // Waktu data terakhir diterima di perangkat ini (render server = saat komponen dipasang).
    let terakhir = Date.now();
    let berjalan = false;
    let aktif = true;
    let timer: number | undefined;

    const sudahLama = () => Date.now() - terakhir >= INTERVAL_PEMBARUAN_MS;

    const jadwalkan = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(saatTimer, Math.max(0, terakhir + INTERVAL_PEMBARUAN_MS - Date.now()));
    };

    const jalankan = async (manual = false) => {
      if (berjalan) return;
      berjalan = true;
      window.clearTimeout(timer);
      try {
        await perbaruiTerkini.current({ manual });
      } finally {
        // Gagal pun dihitung, agar tiap fokus tidak memicu permintaan baru; percobaan berikutnya 30 menit lagi.
        terakhir = Date.now();
        berjalan = false;
        if (aktif) jadwalkan();
      }
    };

    function saatTimer() {
      // Tab tersembunyi: tunda sampai pengguna kembali (ditangani `saatKembali`).
      if (document.visibilityState === "hidden") return;
      if (sudahLama()) void jalankan();
      else jadwalkan();
    }

    const saatKembali = () => {
      if (document.visibilityState === "visible" && sudahLama()) void jalankan();
    };

    jalankanRef.current = jalankan;
    jadwalkan();
    document.addEventListener("visibilitychange", saatKembali);
    window.addEventListener("pageshow", saatKembali);
    window.addEventListener("focus", saatKembali);
    return () => {
      aktif = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", saatKembali);
      window.removeEventListener("pageshow", saatKembali);
      window.removeEventListener("focus", saatKembali);
    };
  }, []);

  return useCallback(() => jalankanRef.current(true), []);
}
