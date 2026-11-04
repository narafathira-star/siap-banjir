import type { SumberData } from "@/lib/layanan-112";

/** Satu baris kontak darurat. telepon null = nomor belum tersedia dari sumber resmi. */
export type KontakDarurat = {
  /** "112" | "117" | "119" | "113" | "bpbd-kabkota" | "bpbd-provinsi" */
  id: string;
  nama: string;
  deskripsi: string;
  telepon: string | null;
  keterangan?: string;
  sumber?: SumberData;
};

/** Catatan saat layanan 112 kab/kota belum diluncurkan (D-042): tidak mengklaim 112 pasti tidak bisa dipakai. */
export type Catatan112 = { judul: string; isi: string; namaKabKota: string };

export type NomorDarurat = {
  /** Nomor yang ditonjolkan (kartu merah besar). */
  utama: KontakDarurat;
  /** Nomor nasional yang ditampilkan di atas bersama 112 (D-051); kosong jika tidak perlu. */
  pendamping: KontakDarurat[];
  lainnya: KontakDarurat[];
  catatan112: Catatan112 | null;
};

/** "(0274) 555585" → "tel:0274555585". */
export const hrefTelepon = (telepon: string) => `tel:${telepon.replace(/[^\d+]/g, "")}`;

/**
 * Urutan halaman Nomor Darurat (D-050, D-051):
 * - 112 sudah diluncurkan di kab/kota (atau wilayah belum dipilih) → 112 utama, lalu BPBD dan nomor nasional lain.
 * - 112 belum diluncurkan + ada BPBD bernomor terverifikasi → BPBD itu utama; 112 tetap di daftar.
 * - 112 belum diluncurkan tanpa BPBD bernomor → 112 utama didampingi semua nomor nasional lain di atas,
 *   karena sumber resmi tidak menjelaskan ke mana 112 tersambung di wilayah seperti itu.
 */
export function susunNomorDarurat(
  kontak: KontakDarurat[],
  layanan112: { tersedia: boolean; namaKabKota: string } | null,
): NomorDarurat {
  const k112 = kontak.find((k) => k.id === "112");
  if (!k112) throw new Error("Kontak 112 wajib ada");
  const bpbd = kontak.filter((k) => k.id.startsWith("bpbd-"));
  const nasionalLain = kontak.filter((k) => k.id !== "112" && !k.id.startsWith("bpbd-"));

  if (!layanan112 || layanan112.tersedia) {
    return { utama: k112, pendamping: [], lainnya: [...bpbd, ...nasionalLain], catatan112: null };
  }

  // Keterangan status 112 dipindah ke catatan di atas, agar tidak ditulis dua kali.
  const catatan112 = {
    judul: `Layanan 112 ${layanan112.namaKabKota} belum tercatat diluncurkan.`,
    isi: k112.keterangan ?? "Jika 112 tidak tersambung, hubungi nomor darurat lain di bawah.",
    namaKabKota: layanan112.namaKabKota,
  };
  const k112TanpaKeterangan: KontakDarurat = { ...k112, keterangan: undefined };
  const bpbdUtama = bpbd.find((k) => k.telepon !== null);
  if (!bpbdUtama) {
    return { utama: k112TanpaKeterangan, pendamping: nasionalLain, lainnya: bpbd, catatan112 };
  }
  return {
    utama: bpbdUtama,
    pendamping: [],
    lainnya: [k112TanpaKeterangan, ...bpbd.filter((k) => k !== bpbdUtama), ...nasionalLain],
    catatan112,
  };
}

/** Butir Checklist Siaga (seed RENDAH) yang isinya disesuaikan status 112 wilayah (D-051). */
export const ISI_PERSIAPAN_CATAT_NOMOR = "Catat nomor darurat 112 dan kontak BPBD setempat di ponsel.";

/**
 * Isi butir "Catat nomor darurat" untuk wilayah ini. 112 sudah diluncurkan (atau tanpa wilayah) →
 * teks asli; selain itu daftar nomor yang bisa dihubungi, 112 tetap disebut beserta statusnya.
 */
export function isiPersiapanCatatNomor(nomor: NomorDarurat): string {
  if (!nomor.catatan112) return ISI_PERSIAPAN_CATAT_NOMOR;
  const bisaDitelepon = [nomor.utama, ...nomor.pendamping, ...nomor.lainnya].filter(
    (k): k is KontakDarurat & { telepon: string } => k.telepon !== null && k.id !== "112",
  );
  const daftar = bisaDitelepon.map((k) => `${k.nama} ${k.telepon}`).join(", ");
  return `Catat nomor darurat di ponsel: ${daftar}, dan 112 (layanan 112 ${nomor.catatan112.namaKabKota} belum tercatat diluncurkan).`;
}
