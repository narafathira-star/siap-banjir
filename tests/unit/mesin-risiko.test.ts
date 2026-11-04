import type { TingkatRisiko } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { konteksAwal, transisi, type EventRisiko, type KonteksRisiko } from "@/lib/mesin-risiko";
import type { RisikoKlien } from "@/lib/tipe-risiko";

const risiko = (level: TingkatRisiko, idWilayah = "33.74.02.1002"): RisikoKlien => ({
  idRisiko: `r-${level}-${idWilayah}`,
  idWilayah,
  namaWilayah: "Kelurahan Bulu Lor, Kota Semarang",
  namaInduk: "Kec. Semarang Utara, Kota Semarang, Jawa Tengah",
  koordinatPerkiraan: false,
  simulasi: false,
  level,
  skorRisiko: level === "TINGGI" ? 80 : level === "SEDANG" ? 50 : 10,
  deskripsi: `Risiko ${level}`,
  parameter: [],
  waktu: "2026-09-25T06:00:00.000Z",
  sumberData: "api",
  waktuAmbilData: "2026-09-25T06:00:00.000Z",
});

const jalankan = (ktx: KonteksRisiko, ...events: EventRisiko[]) => events.reduce(transisi, ktx);

const selesaikanKeduaJalur: EventRisiko[] = [
  { type: "PUSH_DIPICU" },
  { type: "PUSH_SELESAI", kanal: "push" },
  { type: "GRAFIK_DISIAPKAN" },
  { type: "GRAFIK_SELESAI" },
];

describe("state machine risiko", () => {
  it("awal tanpa data: Pemantauan sambil memuat", () => {
    const k = konteksAwal();
    expect(k.state.nama).toBe("pemantauan");
    expect(k.memuat).toBe(true);
  });

  it("EvaluasiRisiko: risiko < ambang → kembali ke Pemantauan", () => {
    const k = konteksAwal(risiko("RENDAH"));
    expect(k.state).toMatchObject({ nama: "pemantauan", data: { level: "RENDAH" } });
    expect(k.memuat).toBe(false);
  });

  it("EvaluasiRisiko: risiko ≥ ambang → Bahaya dengan dua jalur di status awal", () => {
    const k = konteksAwal(risiko("SEDANG"));
    expect(k.state).toMatchObject({ nama: "bahaya", jalurPush: "trigger-push", jalurGrafik: "permintaan-grafik" });
  });

  it("jalur paralel berjalan urut; join ke Detail Penanganan hanya setelah keduanya selesai", () => {
    let k = konteksAwal(risiko("TINGGI"));
    k = jalankan(k, { type: "PUSH_DIPICU" }, { type: "PUSH_SELESAI", kanal: "dalam-aplikasi" });
    expect(k.state).toMatchObject({ nama: "bahaya", jalurPush: "notifikasi-terkirim", jalurGrafik: "permintaan-grafik" });

    k = transisi(k, { type: "GRAFIK_DISIAPKAN" });
    expect(k.state).toMatchObject({ nama: "bahaya", jalurGrafik: "menyiapkan-grafik" });

    k = transisi(k, { type: "GRAFIK_SELESAI" });
    expect(k.state).toMatchObject({ nama: "penanganan", tab: "checklist", kanal: "dalam-aplikasi" });
  });

  it("urutan jalur boleh terbalik (grafik selesai lebih dulu)", () => {
    const k = jalankan(
      konteksAwal(risiko("SEDANG")),
      { type: "GRAFIK_DISIAPKAN" },
      { type: "GRAFIK_SELESAI" },
      { type: "PUSH_DIPICU" },
      { type: "PUSH_SELESAI", kanal: "push" },
    );
    expect(k.state.nama).toBe("penanganan");
  });

  it("event di luar urutan diabaikan (misal PUSH_SELESAI sebelum PUSH_DIPICU)", () => {
    const k = jalankan(konteksAwal(risiko("SEDANG")), { type: "PUSH_SELESAI", kanal: "push" }, { type: "GRAFIK_SELESAI" });
    expect(k.state).toMatchObject({ nama: "bahaya", jalurPush: "trigger-push", jalurGrafik: "permintaan-grafik" });
  });

  it("Detail Penanganan: pindah antara Checklist Siaga dan Detail Mitigasi", () => {
    const k = jalankan(konteksAwal(risiko("SEDANG")), ...selesaikanKeduaJalur, { type: "PILIH_TAB", tab: "mitigasi" });
    expect(k.state).toMatchObject({ nama: "penanganan", tab: "mitigasi" });
  });

  it("Final: kondisi normal kembali saat refresh menemukan risiko rendah", () => {
    const k = jalankan(konteksAwal(risiko("TINGGI")), ...selesaikanKeduaJalur, { type: "DATA_DITERIMA", data: risiko("RENDAH") });
    expect(k.state).toMatchObject({ nama: "selesai", alasan: "normal" });
    // Setelah Final, refresh berikutnya memulai siklus pemantauan baru.
    expect(transisi(k, { type: "DATA_DITERIMA", data: risiko("RENDAH") }).state.nama).toBe("pemantauan");
  });

  it("Final: pengguna menutup peringatan; level sama tidak memunculkan bahaya lagi, level naik memunculkan lagi", () => {
    let k = jalankan(konteksAwal(risiko("SEDANG")), { type: "TUTUP" });
    expect(k.state).toMatchObject({ nama: "selesai", alasan: "ditutup" });

    k = jalankan(k, { type: "LANJUT_PANTAU" }, { type: "DATA_DITERIMA", data: risiko("SEDANG") });
    expect(k.state).toMatchObject({ nama: "selesai", alasan: "ditutup" });

    k = transisi(k, { type: "DATA_DITERIMA", data: risiko("TINGGI") });
    expect(k.state.nama).toBe("bahaya");
  });

  it("level naik Sedang → Tinggi saat di Detail Penanganan memulai episode Bahaya baru", () => {
    const k = jalankan(konteksAwal(risiko("SEDANG")), ...selesaikanKeduaJalur, { type: "DATA_DITERIMA", data: risiko("TINGGI") });
    expect(k.state).toMatchObject({ nama: "bahaya", jalurPush: "trigger-push", data: { level: "TINGGI" } });
  });

  it("level sama saat refresh: tetap di state saat ini, data diperbarui", () => {
    const baru = { ...risiko("SEDANG"), skorRisiko: 60 };
    const k = jalankan(konteksAwal(risiko("SEDANG")), ...selesaikanKeduaJalur, { type: "DATA_DITERIMA", data: baru });
    expect(k.state).toMatchObject({ nama: "penanganan", data: { skorRisiko: 60 } });
  });

  it("deep link notifikasi (BUKA_PENANGANAN) langsung ke Detail Penanganan", () => {
    const k = transisi(konteksAwal(risiko("TINGGI")), { type: "BUKA_PENANGANAN" });
    expect(k.state).toMatchObject({ nama: "penanganan", tab: "checklist", kanal: "push" });
  });

  it("deep link saat risiko sudah rendah: tetap Pemantauan", () => {
    const k = transisi(konteksAwal(risiko("RENDAH")), { type: "BUKA_PENANGANAN" });
    expect(k.state.nama).toBe("pemantauan");
  });

  it("ganti wilayah memulai evaluasi dari awal dan melupakan peringatan yang ditutup", () => {
    let k = jalankan(konteksAwal(risiko("SEDANG")), { type: "TUTUP" });
    k = transisi(k, { type: "DATA_DITERIMA", data: risiko("SEDANG", "12.71.01.1001") });
    expect(k.state).toMatchObject({ nama: "bahaya", data: { idWilayah: "12.71.01.1001" } });
    expect(k.ditutup).toBeNull();
  });

  it("gagal memuat: data lama tetap, galat dicatat", () => {
    const k = jalankan(konteksAwal(risiko("RENDAH")), { type: "MUAT" }, { type: "GAGAL_MUAT", pesan: "offline" });
    expect(k).toMatchObject({ memuat: false, galat: "offline", state: { nama: "pemantauan", data: { level: "RENDAH" } } });
  });
});
