import type { TingkatRisiko } from "@prisma/client";
import { OctagonAlert, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";

type GayaLevel = {
  label: string;
  ikon: LucideIcon;
  solid: string;
  lembut: string;
  teks: string;
  warna: string;
  pesan: string;
  /** Halaman Risiko, "Apa arti setiap level?" (kanvas desain ulang). */
  arti: string;
  /** Beranda (desain ulang, D-046): kalimat tindakan, teks tombol ke halaman Risiko, ilustrasi air. */
  ringkasan: string;
  ajakan: string;
  ilustrasi: { tinggiAir: number; jumlahTetes: number; langit: string };
};

/** Level tidak boleh hanya dibedakan warna: selalu pakai ikon + teks juga. */
export const GAYA_LEVEL: Record<TingkatRisiko, GayaLevel> = {
  RENDAH: {
    label: "Risiko Rendah",
    ikon: ShieldCheck,
    solid: "bg-risk-rendah text-risk-rendah-foreground",
    lembut: "border-risk-rendah-garis bg-risk-rendah-tint",
    teks: "text-risk-rendah-teks",
    warna: "var(--risk-rendah)",
    pesan: "Kondisi normal. Tetap pantau informasi cuaca.",
    arti: "Tidak ada parameter yang melewati ambang Sedang.",
    ringkasan: "Kondisi normal. Tetap pantau informasi cuaca.",
    ajakan: "Lihat persiapan & rekomendasi",
    ilustrasi: { tinggiAir: 4, jumlahTetes: 0, langit: "#e4f0fa" },
  },
  SEDANG: {
    label: "Risiko Sedang",
    ikon: TriangleAlert,
    solid: "bg-risk-sedang text-risk-sedang-foreground",
    lembut: "border-risk-sedang-garis bg-risk-sedang-tint",
    teks: "text-risk-sedang-teks",
    warna: "var(--risk-sedang)",
    pesan: "Waspada. Siapkan persiapan dini dan pantau perkembangan.",
    arti: "Ada parameter yang melewati ambang Sedang. Mulai bersiap.",
    ringkasan: "Siapkan tas siaga, simpan dokumen penting di wadah kedap air, dan pantau informasi resmi BMKG dan BPBD.",
    ajakan: "Lihat langkah siaga",
    ilustrasi: { tinggiAir: 10, jumlahTetes: 14, langit: "#e1e8f0" },
  },
  TINGGI: {
    label: "Risiko Tinggi",
    ikon: OctagonAlert,
    solid: "bg-risk-tinggi text-risk-tinggi-foreground",
    lembut: "border-risk-tinggi-garis bg-risk-tinggi-tint",
    teks: "text-risk-tinggi-teks",
    warna: "var(--risk-tinggi)",
    pesan: "Bahaya potensi banjir. Siap mengungsi dan ikuti arahan petugas.",
    arti: "Ada parameter yang melewati ambang Tinggi. Ikuti arahan evakuasi.",
    ringkasan: "Bersiaplah pindah ke tempat yang lebih tinggi. Ikuti arahan BPBD dan pemerintah setempat.",
    ajakan: "Lihat langkah penyelamatan",
    ilustrasi: { tinggiAir: 20, jumlahTetes: 26, langit: "#d6dde7" },
  },
};
