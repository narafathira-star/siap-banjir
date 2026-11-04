"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { toast } from "sonner";
import { useNotifikasi } from "@/components/notifikasi/notifikasi-provider";
import { usePembaruanOtomatis } from "@/hooks/usePembaruanOtomatis";
import { ambilDataWilayah, ambilJson } from "@/lib/ambil-data-wilayah";
import { teksHasilCek } from "@/lib/hasil-cek";
import { zonaWilayah } from "@/lib/zona-waktu";
import { konteksAwal, transisi, type KanalPeringatan } from "@/lib/mesin-risiko";
import { LABEL_SIMULASI } from "@/lib/risiko";
import type { PenangananKlien, RisikoKlien } from "@/lib/tipe-risiko";
import type { TitikGrafikJam } from "@/server/services/seri-cuaca";

/**
 * Menjalankan state machine risiko untuk satu wilayah beserta efek tiap state.
 * Data awal dirender server (SSR), lalu diperbarui berkala lewat API.
 */
export function useRiskState(awal: {
  idWilayah: string;
  risiko: RisikoKlien;
  grafik: TitikGrafikJam[];
  penanganan: PenangananKlien;
}) {
  const { idWilayah } = awal;
  const [ktx, kirim] = useReducer(transisi, awal.risiko, konteksAwal);
  const [grafik, setGrafik] = useState(awal.grafik);
  const [penanganan, setPenanganan] = useState(awal.penanganan);
  // Hasil cek tombol Perbarui (D-057), mis. "Sudah dicek 01:46 · data terbaru dari 01:33 WIB."
  const [hasilCek, setHasilCek] = useState<string | null>(null);
  const waktuDataTerkini = ktx.state.data?.waktuAmbilData ?? awal.risiko.waktuAmbilData;
  const { status: statusPush, langganan } = useNotifikasi();

  // --- Pemantauan: entry ambil data (API memastikan data Open-Meteo/cache segar) ---
  // Tombol (manual) meminta data Open-Meteo baru bila data ≥ 15 menit; otomatis memakai cache 30 menit.
  const muat = useCallback(
    async ({ manual }: { manual: boolean }) => {
      kirim({ type: "MUAT" });
      setHasilCek(null);
      try {
        const { risiko, hujan48Jam } = await ambilDataWilayah(idWilayah, { segarkan: manual });
        setGrafik(hujan48Jam);
        kirim({ type: "DATA_DITERIMA", data: risiko });
        if (manual) {
          setHasilCek(
            teksHasilCek({
              dicek: new Date(),
              waktuDataSebelum: waktuDataTerkini,
              waktuData: risiko.waktuAmbilData,
              sumber: risiko.sumberData,
              zona: zonaWilayah(idWilayah),
            }),
          );
        }
      } catch (err) {
        kirim({ type: "GAGAL_MUAT", pesan: err instanceof Error ? err.message : "Gagal memuat data" });
      }
    },
    [idWilayah, waktuDataTerkini],
  );

  // Refresh berkala tiap 30 menit; juga saat kembali ke tab/aplikasi bila data sudah lama (D-056).
  const muatUlang = usePembaruanOtomatis(muat);

  // Deep link dari notifikasi push: /risiko?wilayah={id}#penanganan → Detail Penanganan.
  useEffect(() => {
    if (window.location.hash === "#penanganan") kirim({ type: "BUKA_PENANGANAN" });
  }, []);

  // --- Bahaya, Jalur 1: TriggerPush → KirimNotifikasiPush → NotifikasiTerkirim ---
  const s = ktx.state;
  const jalurPush = s.nama === "bahaya" ? s.jalurPush : null;
  const levelBahaya = s.nama === "bahaya" ? s.data.level : null;
  const namaWilayah = s.data?.namaWilayah ?? "";
  const simulasi = s.data?.simulasi ?? false;

  useEffect(() => {
    if (jalurPush === "trigger-push") kirim({ type: "PUSH_DIPICU" });
  }, [jalurPush]);

  useEffect(() => {
    if (jalurPush !== "kirim-notifikasi" || statusPush === "memuat") return;
    // Push dikirim server (cron / saat risiko dihitung). Perangkat tanpa langganan untuk
    // wilayah ini mendapat peringatan di dalam aplikasi.
    const kanal: KanalPeringatan =
      statusPush === "aktif" && langganan?.idWilayah === idWilayah ? "push" : "dalam-aplikasi";
    if (kanal === "dalam-aplikasi") {
      const judul = `Risiko banjir ${levelBahaya === "TINGGI" ? "TINGGI" : "SEDANG"} di ${namaWilayah}`;
      toast.warning(simulasi ? `${LABEL_SIMULASI} ${judul}` : judul, {
        description: simulasi
          ? "Ini simulasi uji, bukan kondisi cuaca sebenarnya."
          : "Periksa persiapan dini dan rekomendasi di halaman ini.",
      });
    }
    kirim({ type: "PUSH_SELESAI", kanal });
  }, [jalurPush, statusPush, langganan, idWilayah, levelBahaya, namaWilayah, simulasi]);

  // --- Bahaya, Jalur 2: PermintaanGrafik → MenyiapkanGrafik → SelesaiRender ---
  const jalurGrafik = s.nama === "bahaya" ? s.jalurGrafik : null;
  useEffect(() => {
    if (jalurGrafik === "permintaan-grafik") kirim({ type: "GRAFIK_DISIAPKAN" });
  }, [jalurGrafik]);
  const grafikSelesaiRender = useCallback(() => kirim({ type: "GRAFIK_SELESAI" }), []);

  // --- Detail Penanganan: entry Persiapan Dini & Lihat Panduan sesuai level terkini ---
  const levelData = s.data?.level ?? null;
  useEffect(() => {
    if (!levelData || levelData === penanganan.level) return;
    let batal = false;
    const q = `level=${levelData}&wilayah=${encodeURIComponent(idWilayah)}`;
    Promise.all([
      ambilJson<PenangananKlien["persiapan"]>(`/api/persiapan?${q}`),
      ambilJson<PenangananKlien["rekomendasi"]>(`/api/rekomendasi?${q}`),
    ])
      .then(([persiapan, rekomendasi]) => {
        if (!batal) setPenanganan({ level: levelData, persiapan, rekomendasi });
      })
      .catch(() => toast.error("Gagal memuat persiapan dan rekomendasi terbaru."));
    return () => {
      batal = true;
    };
  }, [levelData, penanganan.level, idWilayah]);

  return { ktx, kirim, grafik, penanganan, muatUlang, hasilCek, grafikSelesaiRender };
}
