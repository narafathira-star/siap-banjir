/**
 * State machine pemantauan risiko (UML State Machine), sebagai reducer murni.
 *
 *  [*] → Pemantauan (Idle/Pemantauan Lokasi; entry: ambil data; refresh tiap 30 menit)
 *  Pemantauan --data--> ◇ EvaluasiRisiko
 *      [risiko < ambang] → Pemantauan
 *      [risiko ≥ ambang] → Bahaya
 *  Bahaya (paralel):
 *      Jalur 1: TriggerPush → KirimNotifikasiPush → NotifikasiTerkirim
 *      Jalur 2: PermintaanGrafik → MenyiapkanGrafik → SelesaiRender
 *  ═ Join → DetailPenanganan { ChecklistSiaga | DetailMitigasi }
 *  → Final (kondisi normal kembali / pengguna menutup)
 */
import type { TingkatRisiko } from "@prisma/client";
import { URUTAN_LEVEL } from "@/lib/risiko";
import type { RisikoKlien } from "@/lib/tipe-risiko";

/** Level mulai dianggap bahaya (≥ ambang). */
export const AMBANG_BAHAYA: TingkatRisiko = "SEDANG";

export const melewatiAmbang = (level: TingkatRisiko) => URUTAN_LEVEL[level] >= URUTAN_LEVEL[AMBANG_BAHAYA];

export type JalurPush = "trigger-push" | "kirim-notifikasi" | "notifikasi-terkirim";
export type JalurGrafik = "permintaan-grafik" | "menyiapkan-grafik" | "selesai-render";
/** push = perangkat berlangganan (dikirim server); dalam-aplikasi = peringatan di halaman saja. */
export type KanalPeringatan = "push" | "dalam-aplikasi";
export type TabPenanganan = "checklist" | "mitigasi";

export type StateRisiko =
  | { nama: "pemantauan"; data: RisikoKlien | null }
  | { nama: "bahaya"; data: RisikoKlien; jalurPush: JalurPush; kanal: KanalPeringatan | null; jalurGrafik: JalurGrafik }
  | { nama: "penanganan"; data: RisikoKlien; tab: TabPenanganan; kanal: KanalPeringatan | null }
  | { nama: "selesai"; data: RisikoKlien | null; alasan: "normal" | "ditutup" };

export type KonteksRisiko = {
  state: StateRisiko;
  memuat: boolean;
  galat: string | null;
  /** Peringatan yang ditutup pengguna; tidak dimunculkan lagi kecuali level naik. */
  ditutup: { idWilayah: string; level: TingkatRisiko } | null;
};

export type EventRisiko =
  | { type: "MUAT" }
  | { type: "DATA_DITERIMA"; data: RisikoKlien }
  | { type: "GAGAL_MUAT"; pesan: string }
  | { type: "PUSH_DIPICU" }
  | { type: "PUSH_SELESAI"; kanal: KanalPeringatan }
  | { type: "GRAFIK_DISIAPKAN" }
  | { type: "GRAFIK_SELESAI" }
  /** Deep link dari notifikasi: langsung ke Detail Penanganan. */
  | { type: "BUKA_PENANGANAN" }
  | { type: "PILIH_TAB"; tab: TabPenanganan }
  | { type: "TUTUP" }
  | { type: "LANJUT_PANTAU" };

export function konteksAwal(data: RisikoKlien | null = null): KonteksRisiko {
  const awal: KonteksRisiko = { state: { nama: "pemantauan", data: null }, memuat: data === null, galat: null, ditutup: null };
  return data ? transisi(awal, { type: "DATA_DITERIMA", data }) : awal;
}

const masukBahaya = (data: RisikoKlien): StateRisiko => ({
  nama: "bahaya",
  data,
  jalurPush: "trigger-push",
  kanal: null,
  jalurGrafik: "permintaan-grafik",
});

const tertutupOleh = (ditutup: KonteksRisiko["ditutup"], data: RisikoKlien) =>
  ditutup !== null && ditutup.idWilayah === data.idWilayah && URUTAN_LEVEL[data.level] <= URUTAN_LEVEL[ditutup.level];

/** ◇ EvaluasiRisiko (choice state). */
function evaluasiRisiko(ktx: KonteksRisiko, data: RisikoKlien): KonteksRisiko {
  if (!melewatiAmbang(data.level)) {
    // Risiko < ambang: episode bahaya (jika ada) selesai, lupakan peringatan yang ditutup.
    return { ...ktx, ditutup: null, state: { nama: "pemantauan", data } };
  }
  if (tertutupOleh(ktx.ditutup, data)) return { ...ktx, state: { nama: "selesai", data, alasan: "ditutup" } };
  return { ...ktx, state: masukBahaya(data) };
}

/** Join: kedua jalur paralel selesai → Detail Penanganan (sub-state awal: Checklist Siaga). */
function cekJoin(ktx: KonteksRisiko): KonteksRisiko {
  const s = ktx.state;
  if (s.nama === "bahaya" && s.jalurPush === "notifikasi-terkirim" && s.jalurGrafik === "selesai-render") {
    return { ...ktx, state: { nama: "penanganan", data: s.data, tab: "checklist", kanal: s.kanal } };
  }
  return ktx;
}

export function transisi(ktx: KonteksRisiko, event: EventRisiko): KonteksRisiko {
  const s = ktx.state;

  switch (event.type) {
    case "MUAT":
      return { ...ktx, memuat: true, galat: null };

    case "GAGAL_MUAT":
      return { ...ktx, memuat: false, galat: event.pesan };

    case "DATA_DITERIMA": {
      const dasar = { ...ktx, memuat: false, galat: null };
      const d = event.data;
      const aktifBahaya = s.nama === "bahaya" || s.nama === "penanganan";

      // Wilayah berganti → mulai dari awal.
      if (s.data && s.data.idWilayah !== d.idWilayah) {
        return evaluasiRisiko({ ...dasar, ditutup: null }, d);
      }
      if (aktifBahaya) {
        // Final: kondisi normal kembali.
        if (!melewatiAmbang(d.level)) return { ...dasar, ditutup: null, state: { nama: "selesai", data: d, alasan: "normal" } };
        // Level naik (Sedang → Tinggi): episode bahaya baru, jalankan kedua jalur lagi.
        if (URUTAN_LEVEL[d.level] > URUTAN_LEVEL[s.data.level]) return { ...dasar, state: masukBahaya(d) };
        // Masih bahaya dengan level sama/turun: perbarui data, tetap di state saat ini.
        return { ...dasar, state: { ...s, data: d } };
      }
      return evaluasiRisiko(dasar, d);
    }

    case "PUSH_DIPICU":
      return s.nama === "bahaya" && s.jalurPush === "trigger-push"
        ? { ...ktx, state: { ...s, jalurPush: "kirim-notifikasi" } }
        : ktx;

    case "PUSH_SELESAI":
      return s.nama === "bahaya" && s.jalurPush === "kirim-notifikasi"
        ? cekJoin({ ...ktx, state: { ...s, jalurPush: "notifikasi-terkirim", kanal: event.kanal } })
        : ktx;

    case "GRAFIK_DISIAPKAN":
      return s.nama === "bahaya" && s.jalurGrafik === "permintaan-grafik"
        ? { ...ktx, state: { ...s, jalurGrafik: "menyiapkan-grafik" } }
        : ktx;

    case "GRAFIK_SELESAI":
      return s.nama === "bahaya" && s.jalurGrafik === "menyiapkan-grafik"
        ? cekJoin({ ...ktx, state: { ...s, jalurGrafik: "selesai-render" } })
        : ktx;

    case "BUKA_PENANGANAN":
      // Notifikasi sudah diterima lewat push, jadi jalur 1 dianggap selesai.
      if (s.data && melewatiAmbang(s.data.level) && s.nama !== "penanganan") {
        return { ...ktx, ditutup: null, state: { nama: "penanganan", data: s.data, tab: "checklist", kanal: "push" } };
      }
      return ktx;

    case "PILIH_TAB":
      return s.nama === "penanganan" ? { ...ktx, state: { ...s, tab: event.tab } } : ktx;

    case "TUTUP":
      if (s.nama === "bahaya" || s.nama === "penanganan") {
        return {
          ...ktx,
          ditutup: { idWilayah: s.data.idWilayah, level: s.data.level },
          state: { nama: "selesai", data: s.data, alasan: "ditutup" },
        };
      }
      return ktx;

    case "LANJUT_PANTAU":
      return s.nama === "selesai" ? { ...ktx, state: { nama: "pemantauan", data: s.data } } : ktx;
  }
}

/** Label status untuk ditampilkan ke pengguna. */
export const LABEL_STATE: Record<StateRisiko["nama"], string> = {
  pemantauan: "Memantau",
  bahaya: "Bahaya potensi banjir",
  penanganan: "Detail penanganan",
  selesai: "Selesai",
};
