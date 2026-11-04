/**
 * Data seed Siap Banjir. Dipisah dari seed.ts agar bisa diuji (tests/unit/seed-data.test.ts).
 *
 * Wilayah (kode, nama, koordinat) diimpor dari prisma/data/wilayah.tsv.gz (Kemendagri 2025,
 * lihat scripts/impor-wilayah.ts). Di sini hanya profil tambahan dan konten.
 * Kode diambil dari data impor, bukan diketik dari ingatan; test memastikan kode & namanya cocok.
 */
import type {
  AmbangRisikoInput,
  InformasiInput,
  PersiapanDiniInput,
  RekomendasiInput,
} from "../src/server/validators/konten";
import { BUKU_SAKU_BNPB, sumberBukuSaku } from "../src/data/buku-saku-bnpb";
import { ISI_PERSIAPAN_CATAT_NOMOR } from "../src/lib/kontak-darurat";

/** Kode Kemendagri wilayah yang dirujuk konten seed. */
export const KODE = {
  dkiJakarta: "31",
  kalimantanSelatan: "63",
  jakartaUtara: "31.72",
  jakartaBarat: "31.73",
  jakartaTimur: "31.75",
  kotaMedan: "12.71",
  kotaPadang: "13.71",
  kotaPalembang: "16.71",
  kabBandung: "32.04",
  dayeuhkolot: "32.04.12",
  kotaBekasi: "32.75",
  kotaSemarang: "33.74",
  kotaPekalongan: "33.75",
  kotaTangerang: "36.71",
  kotaBanjarmasin: "63.71",
  kotaSamarinda: "64.72",
  kotaManado: "71.71",
  // Riwayat 2024–2026 (D-059).
  aceh: "11",
  sumateraUtara: "12",
  sumateraBarat: "13",
  kabSolok: "13.02",
  kabSukabumi: "32.02",
  jawaTengah: "33",
  bali: "51",
  kabNagekeo: "53.16",
  kalimantanBarat: "61",
  kabSitaro: "71.09",
  kabLuwu: "73.17",
  kotaTernate: "82.71",
  kabNduga: "95.08",
} as const;

export type ProfilWilayah = { idWilayah: string; namaWilayah: string; deskripsi: string };

/** Deskripsi wilayah rawan banjir. `namaWilayah` = nama resmi Kemendagri (diperiksa test). */
export const profilWilayahSeed: ProfilWilayah[] = [
  {
    idWilayah: KODE.jakartaUtara,
    namaWilayah: "Kota Administrasi Jakarta Utara",
    deskripsi: "Kawasan pesisir dataran rendah; rawan banjir kiriman, genangan hujan, dan banjir rob.",
  },
  {
    idWilayah: KODE.jakartaTimur,
    namaWilayah: "Kota Administrasi Jakarta Timur",
    deskripsi: "Dilalui Sungai Ciliwung dan Kali Sunter; permukiman bantaran sungai rawan luapan.",
  },
  {
    idWilayah: KODE.jakartaBarat,
    namaWilayah: "Kota Administrasi Jakarta Barat",
    deskripsi: "Dilalui Kali Angke dan Kali Pesanggrahan; beberapa kawasan rawan genangan saat hujan lebat.",
  },
  {
    idWilayah: KODE.kotaBekasi,
    namaWilayah: "Kota Bekasi",
    deskripsi: "Dilalui Kali Bekasi; perumahan di sekitar pertemuan Kali Cikeas dan Cileungsi rawan banjir.",
  },
  {
    idWilayah: KODE.kotaTangerang,
    namaWilayah: "Kota Tangerang",
    deskripsi: "Dilalui Sungai Cisadane; beberapa kecamatan rawan genangan saat hujan lebat.",
  },
  {
    idWilayah: KODE.dayeuhkolot,
    namaWilayah: "Dayeuhkolot",
    deskripsi: "Cekungan Bandung di tepi Sungai Citarum; langganan banjir luapan saat musim hujan.",
  },
  {
    idWilayah: KODE.kotaSemarang,
    namaWilayah: "Kota Semarang",
    deskripsi: "Kota pesisir dengan penurunan muka tanah; rawan banjir hujan dan banjir rob.",
  },
  {
    idWilayah: KODE.kotaPekalongan,
    namaWilayah: "Kota Pekalongan",
    deskripsi: "Pesisir utara Jawa Tengah; rawan banjir rob dan genangan akibat hujan lebat.",
  },
  {
    idWilayah: KODE.kotaMedan,
    namaWilayah: "Kota Medan",
    deskripsi: "Dilalui Sungai Deli dan Sungai Babura; permukiman bantaran sungai rawan luapan.",
  },
  {
    idWilayah: KODE.kotaSamarinda,
    namaWilayah: "Kota Samarinda",
    deskripsi: "Dilalui Sungai Mahakam dan Sungai Karang Mumus; sering tergenang saat hujan deras.",
  },
  {
    idWilayah: KODE.kotaBanjarmasin,
    namaWilayah: "Kota Banjarmasin",
    deskripsi: "Kota sungai di dataran rendah muara Barito–Martapura; rawan banjir hujan dan pasang.",
  },
  {
    idWilayah: KODE.kotaPalembang,
    namaWilayah: "Kota Palembang",
    deskripsi: "Dilalui Sungai Musi; kawasan rawa dan dataran rendah rawan genangan.",
  },
  {
    idWilayah: KODE.kotaManado,
    namaWilayah: "Kota Manado",
    deskripsi: "Dilalui Sungai Tondano dan beberapa sungai kecil; pernah dilanda banjir bandang.",
  },
  {
    idWilayah: KODE.kotaPadang,
    namaWilayah: "Kota Padang",
    deskripsi: "Kota pesisir dengan curah hujan tinggi; beberapa kawasan rawan banjir dan genangan.",
  },
];

// Ambang default global, mengacu kategori intensitas hujan BMKG.
// Rentang: nilaiMinimum ≤ nilai < nilaiMaksimum; nilaiMaksimum null = tanpa batas atas.
export const ambangSeed: AmbangRisikoInput[] = [
  { parameter: "hujan_24jam", nilaiMinimum: 0, nilaiMaksimum: 20, levelRisiko: "RENDAH", keterangan: "Hujan ringan (< 20 mm/hari)" },
  { parameter: "hujan_24jam", nilaiMinimum: 20, nilaiMaksimum: 50, levelRisiko: "SEDANG", keterangan: "Hujan sedang (20–50 mm/hari)" },
  { parameter: "hujan_24jam", nilaiMinimum: 50, nilaiMaksimum: null, levelRisiko: "TINGGI", keterangan: "Hujan lebat atau lebih (≥ 50 mm/hari)" },

  { parameter: "hujan_1jam", nilaiMinimum: 0, nilaiMaksimum: 10, levelRisiko: "RENDAH", keterangan: "Intensitas < 10 mm/jam" },
  { parameter: "hujan_1jam", nilaiMinimum: 10, nilaiMaksimum: 20, levelRisiko: "SEDANG", keterangan: "Intensitas 10–20 mm/jam" },
  { parameter: "hujan_1jam", nilaiMinimum: 20, nilaiMaksimum: null, levelRisiko: "TINGGI", keterangan: "Intensitas ≥ 20 mm/jam" },

  { parameter: "hujan_3hari", nilaiMinimum: 0, nilaiMaksimum: 60, levelRisiko: "RENDAH", keterangan: "Akumulasi 3 hari < 60 mm" },
  { parameter: "hujan_3hari", nilaiMinimum: 60, nilaiMaksimum: 120, levelRisiko: "SEDANG", keterangan: "Akumulasi 3 hari 60–120 mm; tanah mulai jenuh" },
  { parameter: "hujan_3hari", nilaiMinimum: 120, nilaiMaksimum: null, levelRisiko: "TINGGI", keterangan: "Akumulasi 3 hari ≥ 120 mm; tanah jenuh" },

  { parameter: "prakiraan_hujan_24jam", nilaiMinimum: 0, nilaiMaksimum: 20, levelRisiko: "RENDAH", keterangan: "Prakiraan 24 jam < 20 mm" },
  { parameter: "prakiraan_hujan_24jam", nilaiMinimum: 20, nilaiMaksimum: 50, levelRisiko: "SEDANG", keterangan: "Prakiraan 24 jam 20–50 mm" },
  { parameter: "prakiraan_hujan_24jam", nilaiMinimum: 50, nilaiMaksimum: null, levelRisiko: "TINGGI", keterangan: "Prakiraan 24 jam ≥ 50 mm" },
];

export const persiapanSeed: PersiapanDiniInput[] = [
  // RENDAH
  { levelRisiko: "RENDAH", urutan: 1, isiPersiapan: "Bersihkan selokan dan saluran air di sekitar rumah dari sampah." },
  { levelRisiko: "RENDAH", urutan: 2, isiPersiapan: "Simpan dokumen penting (KTP, KK, ijazah, sertifikat) dalam map atau plastik kedap air." },
  // Isinya disesuaikan status layanan 112 wilayah saat ditampilkan (lihatPersiapanWilayah, D-051).
  { levelRisiko: "RENDAH", urutan: 3, isiPersiapan: ISI_PERSIAPAN_CATAT_NOMOR },
  { levelRisiko: "RENDAH", urutan: 4, isiPersiapan: "Kenali jalur evakuasi dan titik kumpul terdekat dari rumah." },
  // SEDANG
  { levelRisiko: "SEDANG", urutan: 1, isiPersiapan: "Siapkan tas siaga: dokumen, obat-obatan, senter, pakaian ganti, makanan dan air minum untuk 3 hari." },
  { levelRisiko: "SEDANG", urutan: 2, isiPersiapan: "Isi penuh daya ponsel dan power bank." },
  { levelRisiko: "SEDANG", urutan: 3, isiPersiapan: "Pindahkan barang berharga dan peralatan elektronik ke tempat yang lebih tinggi." },
  { levelRisiko: "SEDANG", urutan: 4, isiPersiapan: "Pantau informasi dari BMKG dan BPBD serta kondisi sungai di dekat rumah." },
  { levelRisiko: "SEDANG", urutan: 5, isiPersiapan: "Sepakati titik kumpul dan cara berkomunikasi dengan anggota keluarga." },
  // TINGGI
  { levelRisiko: "TINGGI", urutan: 1, isiPersiapan: "Letakkan tas siaga di dekat pintu keluar agar mudah dibawa." },
  { levelRisiko: "TINGGI", urutan: 2, isiPersiapan: "Dahulukan lansia, anak-anak, ibu hamil, dan penyandang disabilitas untuk bersiap mengungsi." },
  { levelRisiko: "TINGGI", urutan: 3, isiPersiapan: "Pindahkan kendaraan ke tempat yang lebih tinggi." },
  { levelRisiko: "TINGGI", urutan: 4, isiPersiapan: "Siap mematikan listrik dan gas dari sumber utama jika air mulai masuk rumah." },
  { levelRisiko: "TINGGI", urutan: 5, isiPersiapan: "Berkoordinasi dengan RT/RW dan ikuti arahan petugas." },
  // Contoh konten khusus wilayah (ditampilkan lebih dulu dari konten global).
  { idWilayah: KODE.jakartaUtara, levelRisiko: "SEDANG", urutan: 0, isiPersiapan: "Perhatikan jadwal pasang air laut; hujan lebat saat pasang dapat memperparah genangan rob." },
  { idWilayah: KODE.kotaSemarang, levelRisiko: "SEDANG", urutan: 0, isiPersiapan: "Perhatikan jadwal pasang air laut; kawasan pesisir Semarang rawan rob bersamaan dengan hujan." },
  { idWilayah: KODE.dayeuhkolot, levelRisiko: "SEDANG", urutan: 0, isiPersiapan: "Pantau tinggi muka air Sungai Citarum dan informasi dari aparat desa/kelurahan." },
];

/**
 * Buku Saku BNPB, bab Banjir: Prabencana hal. 33–35, Saat Bencana hal. 36–37, Pascabencana hal. 38–39
 * (DECISIONS D-044). Nomor halaman = nomor cetak di buku; di file PDF halamannya +2.
 */
export { BUKU_SAKU_BNPB, sumberBukuSaku };

/**
 * Detail Mitigasi dari Buku Saku BNPB (parafrase dekat; tidak menambah hal yang tidak disebut buku).
 * Level risiko = potensi banjir: RENDAH/SEDANG → prabencana, TINGGI → siaga evakuasi + bagian
 * "Jika banjir terjadi". Langkah pascabencana ada di Informasi (lihat informasiSeed).
 */
export const rekomendasiSeed: RekomendasiInput[] = [
  // RENDAH: kesiapsiagaan prabencana
  { levelRisiko: "RENDAH", urutan: 1, isiRekomendasi: "Ketahui apakah tempat tinggal Anda berada di zona rawan banjir.", ...sumberBukuSaku("33") },
  { levelRisiko: "RENDAH", urutan: 2, isiRekomendasi: "Kenali saluran dan jalur yang sering dilalui air banjir serta dampaknya bagi rumah Anda.", ...sumberBukuSaku("33") },
  { levelRisiko: "RENDAH", urutan: 3, isiRekomendasi: "Pahami istilah peringatan banjir, seperti Siaga I sampai Siaga IV, dan langkah yang harus dilakukan pada tiap tingkat.", ...sumberBukuSaku("33") },
  { levelRisiko: "RENDAH", urutan: 4, isiRekomendasi: "Ketahui cara mematikan air, listrik, dan gas di rumah.", ...sumberBukuSaku("34") },
  { levelRisiko: "RENDAH", urutan: 5, isiRekomendasi: "Simpan dokumen penting di tempat yang aman. Buat catatan dan foto harta benda Anda.", ...sumberBukuSaku("34–35") },
  // SEDANG: persiapan evakuasi (prabencana) + pantau informasi
  { levelRisiko: "SEDANG", urutan: 1, isiRekomendasi: "Siapkan evakuasi: pahami rute evakuasi dan lokasi daerah yang lebih tinggi.", ...sumberBukuSaku("34") },
  { levelRisiko: "SEDANG", urutan: 2, isiRekomendasi: "Bicarakan ancaman banjir dengan keluarga dan sepakati tempat bertemu jika terpencar.", ...sumberBukuSaku("34") },
  { levelRisiko: "SEDANG", urutan: 3, isiRekomendasi: "Siapkan bekal untuk hidup mandiri sekurangnya tiga hari: tas siaga bencana, makanan, dan air minum.", ...sumberBukuSaku("34") },
  { levelRisiko: "SEDANG", urutan: 4, isiRekomendasi: "Ketahui kebutuhan khusus anggota keluarga dan tetangga bila banjir terjadi.", ...sumberBukuSaku("34") },
  { levelRisiko: "SEDANG", urutan: 5, isiRekomendasi: "Simak informasi banjir dari berbagai media. Informasi resmi di daerah biasanya berasal dari BPBD.", ...sumberBukuSaku("33, 36") },
  // TINGGI: siaga evakuasi
  { levelRisiko: "TINGGI", urutan: 1, isiRekomendasi: "Simak terus informasi banjir dari berbagai media untuk meningkatkan kesiapsiagaan.", ...sumberBukuSaku("36") },
  { levelRisiko: "TINGGI", urutan: 2, isiRekomendasi: "Bersiap evakuasi dengan mengamankan rumah. Jika masih ada waktu, pindahkan perabot ke tempat yang aman dari banjir dan letakkan barang berharga di bagian rumah yang lebih tinggi.", ...sumberBukuSaku("36") },
  { levelRisiko: "TINGGI", urutan: 3, isiRekomendasi: "Matikan jaringan listrik bila ada instruksi dari pihak berwenang dan cabut peralatan yang tersambung listrik. Jangan menyentuh peralatan listrik saat berdiri di air.", ...sumberBukuSaku("36") },
  { levelRisiko: "TINGGI", urutan: 4, isiRekomendasi: "Bersihkan dan siapkan penampungan air untuk berjaga-jaga jika kehabisan air bersih.", ...sumberBukuSaku("37") },
  { levelRisiko: "TINGGI", urutan: 5, isiRekomendasi: "Waspadai saluran air dan jalur yang bisa dilalui arus deras. Banjir bandang kerap datang tanpa peringatan, bahkan saat hujan biasa.", ...sumberBukuSaku("36–37") },
  // TINGGI: jika banjir terjadi (panduan saat bencana)
  { levelRisiko: "TINGGI", bagian: "JIKA_BANJIR", urutan: 1, isiRekomendasi: "Segera evakuasi ke tempat yang lebih tinggi.", ...sumberBukuSaku("36") },
  { levelRisiko: "TINGGI", bagian: "JIKA_BANJIR", urutan: 2, isiRekomendasi: "Jangan berjalan di arus air. Beberapa langkah saja di arus air dapat membuat Anda jatuh.", ...sumberBukuSaku("37") },
  { levelRisiko: "TINGGI", bagian: "JIKA_BANJIR", urutan: 3, isiRekomendasi: "Jika terpaksa berjalan di air, pilih pijakan yang tidak bergerak dan gunakan tongkat untuk memeriksa pijakan.", ...sumberBukuSaku("37") },
  { levelRisiko: "TINGGI", bagian: "JIKA_BANJIR", urutan: 4, isiRekomendasi: "Jangan mengemudikan mobil di wilayah banjir. Jika air mulai naik, tinggalkan mobil dan pergi ke tempat yang lebih tinggi.", ...sumberBukuSaku("37") },
  { levelRisiko: "TINGGI", bagian: "JIKA_BANJIR", urutan: 5, isiRekomendasi: "Waspadai arus bawah, saluran air, kubangan, dan tempat lain yang tergenang air.", ...sumberBukuSaku("36") },
];

export const informasiSeed: InformasiInput[] = [
  // ----- UMUM -----
  {
    kategori: "UMUM",
    tanggal: "2026-01-05",
    judul: "Mengenal Banjir dan Penyebabnya",
    isi:
      "Banjir terjadi ketika air meluap dan menggenangi daratan yang biasanya kering. Penyebab umumnya adalah hujan lebat dalam waktu lama, luapan sungai, saluran air yang tersumbat, air laut pasang (rob), serta berkurangnya daerah resapan air.\n\nBanjir dapat datang perlahan (genangan) maupun tiba-tiba (banjir bandang). Karena itu penting untuk memantau curah hujan, bukan hanya di wilayah sendiri tetapi juga di daerah hulu sungai.",
  },
  {
    kategori: "UMUM",
    tanggal: "2026-01-06",
    judul: "Kategori Intensitas Hujan Menurut BMKG",
    isi:
      "BMKG mengelompokkan curah hujan harian sebagai berikut:\n- Hujan ringan: 0,5–20 mm/hari\n- Hujan sedang: 20–50 mm/hari\n- Hujan lebat: 50–100 mm/hari\n- Hujan sangat lebat: 100–150 mm/hari\n- Hujan ekstrem: lebih dari 150 mm/hari\n\nSiap Banjir memakai kategori ini sebagai dasar ambang batas level risiko Rendah, Sedang, dan Tinggi.",
  },
  {
    kategori: "UMUM",
    tanggal: "2026-01-07",
    judul: "Isi Tas Siaga Bencana",
    isi:
      "Tas siaga bencana sebaiknya disiapkan sebelum musim hujan. Isinya antara lain: salinan dokumen penting dalam plastik kedap air, obat-obatan pribadi, senter dan baterai cadangan, power bank, pakaian ganti, makanan tahan lama dan air minum untuk 3 hari, uang tunai secukupnya, peluit, serta masker.\n\nLetakkan tas di tempat yang mudah dijangkau dan beri tahu seluruh anggota keluarga.",
  },
  {
    kategori: "UMUM",
    tanggal: "2026-09-28",
    judul: "Nomor Darurat yang Perlu Disimpan",
    // Nomor dari tabel "Kontak Darurat" Buku Saku BNPB hal. 82 (D-051).
    isi:
      "Simpan nomor berikut di ponsel Anda:\n- 112: Telepon darurat\n- 115: Basarnas (pencarian dan pertolongan)\n- 117: Call Center BNPB\n- 110: Polisi\n- 119: Ambulans\n- 113: Pemadam kebakaran\n\nLayanan 112 diselenggarakan per kabupaten/kota dan belum tersedia di semua daerah. Status layanan 112 di wilayah Anda (menurut Portal 112 Komdigi) dan nomor BPBD yang sudah diverifikasi dari situs resmi tampil di halaman Nomor Darurat (tombol Darurat di bagian atas aplikasi).\n\nCari juga nomor BPBD kabupaten/kota Anda melalui situs resmi pemerintah daerah.",
    ...sumberBukuSaku("82"),
  },
  {
    // Panduan pascabencana: selalu bisa dibuka di Informasi, tidak bergantung level risiko (D-044).
    kategori: "UMUM",
    tanggal: "2026-09-27",
    judul: "Setelah Banjir Surut: Langkah Aman Menurut BNPB",
    isi:
      "Langkah berikut dari Buku Saku BNPB untuk masa setelah banjir (pascabencana).\n\nKeselamatan:\n- Hindari air banjir karena mungkin tercemar zat berbahaya dan ada ancaman tersengat listrik.\n- Waspadai instalasi listrik.\n- Hindari air yang bergerak.\n- Hindari area yang airnya baru saja surut karena jalan bisa keropos dan ambles.\n- Hindari lokasi yang masih terkena bencana, kecuali jika pihak berwenang membutuhkan sukarelawan.\n- Kembali ke rumah sesuai perintah pihak berwenang.\n- Tetap di luar gedung atau rumah yang masih dikelilingi air.\n- Hati-hati saat memasuki gedung karena ada ancaman kerusakan yang tidak terlihat, seperti pada fondasi.\n\nKesehatan dan kebersihan:\n- Cuci tangan dengan sabun dan air bersih jika Anda terkena air banjir.\n- Buang makanan yang terkontaminasi air banjir.\n- Dengarkan berita atau informasi tentang kondisi air, serta tempat mendapatkan bantuan hunian, pakaian, dan makanan.\n- Dapatkan perawatan kesehatan di fasilitas kesehatan terdekat.\n- Bersihkan tempat tinggal dan lingkungan rumah dari sisa kotoran setelah banjir.\n- Lakukan Pemberantasan Sarang Nyamuk (PSN).\n- Ikut serta dalam kaporitisasi sumur gali serta perbaikan jamban dan Saluran Pembuangan Air Limbah (SPAL).",
    ...sumberBukuSaku("38–39"),
  },
  {
    kategori: "UMUM",
    tanggal: "2026-01-09",
    judul: "Tentang Level Risiko di Siap Banjir",
    isi:
      "Level risiko pada Siap Banjir adalah estimasi berdasarkan data cuaca Open-Meteo dan ambang batas risiko yang telah ditentukan. Informasi ini bukan peringatan resmi. Selalu ikuti arahan BMKG, BPBD, dan pemerintah setempat.",
  },
  {
    // Artikel pengenalan risiko, bukan laporan kejadian: tanggal = tanggal terbit.
    kategori: "UMUM",
    idWilayah: KODE.dayeuhkolot,
    tanggal: "2026-01-10",
    judul: "Mengenal Risiko Banjir Luapan Citarum di Cekungan Bandung",
    isi:
      "Dayeuhkolot dan sekitarnya berada di dataran rendah Cekungan Bandung yang dilalui Sungai Citarum. Saat hujan lebat berlangsung beberapa hari di wilayah hulu, luapan Citarum dapat menggenangi permukiman selama berhari-hari. Pantau curah hujan akumulasi 3 hari, bukan hanya hujan hari ini.\n\nArtikel ini menjelaskan risiko secara umum, bukan laporan kejadian banjir pada tanggal tertentu. Kejadian banjir yang terdokumentasi ada di bagian Riwayat kejadian banjir.",
  },
  // ----- RIWAYAT_KEJADIAN -----
  // Setiap entri wajib punya sumber yang bisa dibuka dan isinya hanya memuat hal yang disebut
  // sumber tersebut (DECISIONS D-039). Utamakan sumber resmi (BNPB/BMKG, lalu instansi
  // pemerintah lain). Semua tautan diperiksa 25 September 2026; entri 2024–2026 diperiksa
  // 30 September 2026 (D-059). Cek ulang: npm run cek:sumber.
  // Tanggal = tanggal kejadian. Bila sumber utama tidak menyebutnya, tanggal diambil dari rilis BNPB lain
  // (sumberTanggal*); jika tidak ada, tanggal data ditampilkan sebagai "Data per …" (tanggalDataPer).
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.dkiJakarta,
    tanggal: "2020-01-01",
    judul: "Banjir Jabodetabek Awal Tahun 2020",
    isi:
      "Hujan ekstrem yang mengguyur Jabodetabek pada malam tahun baru, 1 Januari 2020, menyebabkan banjir. BNPB mencatat 16 orang meninggal pada hari itu, tersebar di DKI Jakarta, Kota Bekasi, Kota Depok, Kota dan Kabupaten Bogor, Kota Tangerang, dan Tangerang Selatan.",
    sumberNama: "BNPB, 1 Januari 2020",
    sumberUrl: "https://www.bnpb.go.id/berita/update-korban-banjir-jabodetabek-16-orang",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kotaBekasi,
    tanggal: "2020-01-01",
    judul: "Banjir Kota Bekasi 1 Januari 2020",
    isi:
      "Kota Bekasi menjadi salah satu wilayah yang parah terdampak banjir awal tahun 2020, dengan ketinggian air mencapai 6 meter. Pemerintah Kota Bekasi menetapkan status tanggap darurat banjir dan longsor pada 1–7 Januari 2020.",
    sumberNama: "BNPB, 3 Januari 2020",
    sumberUrl: "https://www.bnpb.go.id/berita/update-data-dampak-banjir-di-kota-bekasi-per-3-januari-2020-pukul-1100-wib",
  },
  {
    // Sebelum BNPB berdiri (2008); sumber resmi: arsip Pemprov DKI Jakarta.
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.dkiJakarta,
    tanggal: "2007-02-01",
    judul: "Banjir Besar Jakarta Februari 2007",
    isi:
      "Hujan lebat sejak sore 1 Februari hingga 2 Februari 2007, ditambah volume air 13 sungai dari Bogor-Puncak-Cianjur dan air laut yang pasang, menyebabkan banjir sejak 1 Februari malam hingga 12 Februari 2007. Hampir 60 persen wilayah DKI Jakarta terendam, dengan kedalaman hingga lima meter di beberapa titik.",
    sumberNama: "Dinas Perpustakaan dan Kearsipan Provinsi DKI Jakarta",
    sumberUrl: "https://dispusip.jakarta.go.id/dinas/publications/article/banjir-abad-ke-20-dan-abad-ke-21",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kotaManado,
    tanggal: "2014-01-15",
    judul: "Banjir Bandang Manado Januari 2014",
    isi:
      "Pada 15 Januari 2014 hujan deras terus-menerus di Kota Manado dan sekitarnya membuat DAS Sawangan dan DAS Tondano tidak mampu menampung debit air, sehingga meluap dan menyebabkan banjir serta tanah longsor.",
    sumberNama: "BNPB, 16 Januari 2014",
    sumberUrl: "https://www.bnpb.go.id/berita/update-banjir-manado-5-tewas",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kalimantanSelatan,
    tanggal: "2021-01-12",
    judul: "Banjir Kalimantan Selatan Januari 2021",
    isi:
      "Hujan yang turun sejak Selasa, 12 Januari 2021, menyebabkan banjir di 10 kabupaten/kota di Kalimantan Selatan, termasuk Kota Banjarmasin. Hingga 17 Januari 2021, BNPB mencatat 24.379 rumah terendam dan 39.549 warga mengungsi.",
    sumberNama: "BNPB, 17 Januari 2021",
    sumberUrl: "https://www.bnpb.go.id/berita/-update-10-kabupaten-kota-terdampak-banjir-di-kalimantan-selatan",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kotaSemarang,
    tanggal: "2021-02-06",
    judul: "Banjir Semarang Februari 2021",
    isi:
      "Hujan lebat memicu banjir di sejumlah wilayah Kota Semarang pada Jumat, 5 Februari, dan Sabtu, 6 Februari 2021, antara lain di Kecamatan Semarang Utara, Gayamsari, Tugu, Semarang Barat, dan Ngaliyan. Ketinggian air umumnya 70–100 cm dan di beberapa titik mencapai 150 cm.",
    sumberNama: "BNPB, 7 Februari 2021",
    sumberUrl: "https://www.bnpb.go.id/berita/-update-sejumlah-wilayah-kota-semarang-masih-dilanda-banjir-parah-",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kotaMedan,
    tanggal: "2020-12-03",
    judul: "Banjir Medan Desember 2020",
    isi:
      "Pada Kamis, 3 Desember 2020, sekitar pukul 22.30 WIB, hujan berintensitas tinggi membuat Sungai Deli, Sungai Babura, dan Sungai Denai meluap. Banjir setinggi 3–5 meter merendam empat kecamatan di Kota Medan (Medan Johor, Medan Maimun, Medan Sunggal, dan Medan Tuntungan); 5.965 jiwa terdampak.",
    sumberNama: "BNPB, 4 Desember 2020",
    sumberUrl: "https://www.bnpb.go.id/berita/5-965-jiwa-terdampak-banjir-kota-medan",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kotaSamarinda,
    tanggal: "2019-06-12",
    judul: "Banjir Samarinda Juni 2019",
    isi:
      "Luapan Sungai Bengkuring dan hujan berintensitas tinggi menyebabkan banjir di delapan kelurahan di empat kecamatan Kota Samarinda, antara lain Sempaja Utara, Gunung Lingai, dan Sempaja Timur, dengan ketinggian air rata-rata 25–125 cm. Hingga 12 Juni 2019, BNPB mencatat 35.684 jiwa terdampak sejak sepekan sebelumnya.",
    sumberNama: "BNPB, 12 Juni 2019",
    sumberUrl:
      "https://www.bnpb.go.id/berita/banjir-kepung-sejumlah-wilayah-di-indonesia-bnpb-terjunkan-lebih-banyak-tim-dan-peralatan",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.sumateraBarat,
    tanggal: "2024-05-11",
    judul: "Banjir Lahar Hujan Sumatra Barat Mei 2024",
    isi:
      "Banjir lahar hujan dan banjir bandang melanda Sumatra Barat pada Sabtu malam, 11 Mei 2024. Hingga 13 Mei 2024, BNPB mencatat 43 orang meninggal dunia (Kabupaten Agam 19, Tanah Datar 14, Padang Pariaman 8, Padang Panjang 2) dan 15 orang dalam pencarian. Pengungsi tercatat 1.159 jiwa di Kabupaten Agam dan 2.039 jiwa di Kabupaten Tanah Datar.",
    sumberNama: "BNPB, 13 Mei 2024",
    sumberUrl: "https://www.bnpb.go.id/berita/update-korban-banjir-lahar-hujan-sumatra-barat-mencapai-43-orang",
    sumberTanggalNama: "BNPB, 12 Mei 2024 (Tanah Datar)",
    sumberTanggalUrl: "https://www.bnpb.go.id/berita/banjir-landa-tanah-datar-tujuh-orang-meninggal-dunia",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kabLuwu,
    tanggal: "2024-05-03",
    judul: "Banjir dan Longsor Kabupaten Luwu Mei 2024",
    isi:
      "Banjir dan longsor terjadi di Kabupaten Luwu, Sulawesi Selatan, pada Jumat, 3 Mei 2024, pukul 01.17 WITA dan berdampak pada 13 kecamatan dengan ketinggian muka air 1–3 meter. BNPB mencatat 14 warga meninggal dunia. Per 4 Mei 2024, 1.385 KK terdampak, 115 jiwa mengungsi, dan 1.867 rumah terdampak.",
    sumberNama: "BNPB, 4 Mei 2024",
    sumberUrl: "https://www.bnpb.go.id/berita/total-14-warga-meninggal-dunia-akibat-banjir-dan-longsor-di-kabupaten-luwu",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kotaTernate,
    tanggal: "2024-08-25",
    judul: "Banjir Bandang Kota Ternate Agustus 2024",
    isi:
      "Banjir bandang terjadi di Kota Ternate, Maluku Utara, pada Minggu, 25 Agustus 2024, pukul 03.30 WIT. Per 26 Agustus 2024, BNPB mencatat 16 warga Kelurahan Rua, Kecamatan Pulau Ternate, meninggal dunia, delapan warga luka-luka, dan tiga warga masih dalam pencarian.",
    sumberNama: "BNPB, 26 Agustus 2024",
    sumberUrl: "https://www.bnpb.go.id/berita/update-banjir-bandang-kota-ternate-16-warga-meningal-dunia-tiga-warga-dalam-pencarian",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kabSukabumi,
    tanggal: "2024-12-03",
    judul: "Banjir dan Tanah Longsor Kabupaten Sukabumi Desember 2024",
    isi:
      "Bencana hidrometeorologi basah (banjir dan tanah longsor) pada Selasa, 3 Desember 2024, berdampak di sejumlah lokasi di Kabupaten Sukabumi, Jawa Barat. Per 11 Desember 2024, BNPB mencatat 20.629 warga terdampak, 3.464 warga mengungsi, dan 2.058 rumah rusak berat.",
    sumberNama: "BNPB, 12 Desember 2024",
    sumberUrl: "https://www.bnpb.go.id/berita/update-banjir-dan-tanah-longsor-sukabumi-sebanyak-20629-warga-terdampak-dan-3464-mengungsi",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kalimantanBarat,
    tanggal: "2025-01-30",
    tanggalDataPer: true,
    judul: "Banjir Kalimantan Barat Januari 2025",
    isi:
      "Sejak pertengahan Januari 2025, banjir dengan ketinggian rata-rata dua meter merendam Kabupaten Sambas, Landak, Mempawah, Bengkayang, Kubu Raya, dan Kota Singkawang. Data yang disampaikan pada rapat koordinasi 30 Januari 2025 mencatat 148.693 jiwa terdampak dan sedikitnya 606 jiwa mengungsi.",
    sumberNama: "BNPB, 31 Januari 2025",
    sumberUrl: "https://www.bnpb.go.id/berita/enam-kabupaten-di-kalimantan-barat-terendam-banjir-kepala-bnpb-minta-belajar-dari-sintang",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.bali,
    tanggal: "2025-09-10",
    judul: "Banjir dan Longsor Bali September 2025",
    isi:
      "Banjir dan tanah longsor yang dilaporkan sejak Rabu, 10 September 2025, melanda tujuh kabupaten/kota di Bali dengan lebih dari 120 titik banjir, terbanyak di Kota Denpasar (81 titik). Per 11 September 2025 pukul 11.00 WIB, 14 orang meninggal dunia (Kota Denpasar 8, Kabupaten Jembrana 2, Gianyar 3, Badung 1) dan dua warga Kota Denpasar masih dalam pencarian.",
    sumberNama: "BNPB, 11 September 2025",
    sumberUrl: "https://www.bnpb.go.id/berita/update-tujuh-wilayah-provinsi-bali-terdampak-banjir-dan-longsor",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kabNagekeo,
    tanggal: "2025-09-08",
    judul: "Banjir Bandang Nagekeo September 2025",
    isi:
      "Banjir bandang melanda Kabupaten Nagekeo, Nusa Tenggara Timur, pada Senin, 8 September 2025, dan berdampak pada 14 desa di Kecamatan Mauponggo, Nangaroro, dan Boawae. Per 10 September 2025, empat orang meninggal dunia dan empat orang masih dinyatakan hilang.",
    sumberNama: "BNPB, 10 September 2025",
    sumberUrl: "https://www.bnpb.go.id/berita/update-banjir-bandang-nagekeo-korban-meninggal-jadi-4-orang-dan-bnpb-berangkat-ke-lokasi-malam-ini",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kabNduga,
    tanggal: "2025-11-01",
    judul: "Banjir Bandang Nduga November 2025",
    isi:
      "Banjir bandang akibat hujan berintensitas tinggi di kawasan hulu melanda dua distrik di Kabupaten Nduga, Papua Pegunungan, pada Sabtu, 1 November 2025, pukul 17.00 waktu setempat. Per 4 November 2025, 15 orang ditemukan meninggal dunia dan 8 orang masih dicari di Kampung Yuguru, Distrik Meborok.",
    sumberNama: "BNPB, 4 November 2025",
    sumberUrl: "https://www.bnpb.go.id/berita/update-banjir-bandang-nduga-15-orang-meninggal-dunia-8-orang-masih-dalam-pencarian",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.aceh,
    tanggal: "2025-12-14",
    tanggalDataPer: true,
    judul: "Banjir dan Longsor Aceh 2025",
    isi:
      "Banjir dan longsor melanda Aceh bersamaan dengan Sumatra Utara dan Sumatra Barat. Per 14 Desember 2025, BNPB mencatat 424 orang meninggal dunia dan 32 orang hilang di Aceh, dari total 1.016 korban meninggal di ketiga provinsi.",
    sumberNama: "BNPB, 14 Desember 2025",
    sumberUrl: "https://www.bnpb.go.id/berita/total-korban-meninggal-dunia-akibat-bansor-sumatra-1016-jiwa",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.sumateraUtara,
    tanggal: "2025-11-24",
    judul: "Banjir dan Longsor Sumatra Utara November 2025",
    isi:
      "Cuaca ekstrem pada Senin–Selasa, 24–25 November 2025, memicu banjir dan tanah longsor di Sibolga, Tapanuli Utara, Tapanuli Tengah, dan Tapanuli Selatan. Per 14 Desember 2025, BNPB mencatat 349 orang meninggal dunia dan 90 orang hilang di Sumatra Utara, dari total 1.016 korban meninggal di Aceh, Sumatra Utara, dan Sumatra Barat.",
    sumberNama: "BNPB, 14 Desember 2025",
    sumberUrl: "https://www.bnpb.go.id/berita/total-korban-meninggal-dunia-akibat-bansor-sumatra-1016-jiwa",
    sumberTanggalNama: "BNPB, 26 November 2025",
    sumberTanggalUrl: "https://www.bnpb.go.id/berita/empat-kabupaten-di-sumatera-utara-dilanda-bencana-banjir-dan-longsor-secara-bersamaan",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.sumateraBarat,
    tanggal: "2025-12-14",
    tanggalDataPer: true,
    judul: "Banjir dan Longsor Sumatra Barat 2025",
    isi:
      "Banjir dan longsor melanda Sumatra Barat bersamaan dengan Aceh dan Sumatra Utara. Per 14 Desember 2025, BNPB mencatat 243 orang meninggal dunia dan 90 orang hilang di Sumatra Barat, dari total 1.016 korban meninggal di ketiga provinsi.",
    sumberNama: "BNPB, 14 Desember 2025",
    sumberUrl: "https://www.bnpb.go.id/berita/total-korban-meninggal-dunia-akibat-bansor-sumatra-1016-jiwa",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kabSitaro,
    tanggal: "2026-01-05",
    judul: "Banjir Bandang Sitaro Januari 2026",
    isi:
      "Hujan berintensitas tinggi sejak dini hari membuat aliran sungai meluap tiba-tiba pada Senin, 5 Januari 2026, pukul 02.30 WITA, di Kabupaten Kepulauan Siau Tagulandang Biaro (Sitaro), Sulawesi Utara. Banjir bandang berdampak pada empat kecamatan: Siau Timur, Siau Tengah, Siau Barat, dan Siau Barat Selatan. Hingga 6 Januari 2026, 16 orang meninggal dunia, tiga orang masih dicari, 22 orang luka, dan sekitar 682 jiwa mengungsi.",
    sumberNama: "BNPB, 6 Januari 2026",
    sumberUrl: "https://www.bnpb.go.id/berita/update-banjir-bandang-sitaro-korban-meninggal-jadi-16-orang",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.jawaTengah,
    tanggal: "2026-01-19",
    tanggalDataPer: true,
    judul: "Banjir Pantura Jawa Tengah Januari 2026",
    isi:
      "Hujan ekstrem di wilayah Pantai Utara (Pantura) Jawa Tengah menyebabkan banjir di Kabupaten Demak, Kendal, Batang, Pemalang, dan Kota Pekalongan. Hingga 19 Januari 2026, BNPB mencatat 71.479 jiwa terdampak dan 2.440 jiwa mengungsi.",
    sumberNama: "BNPB, 19 Januari 2026",
    sumberUrl: "https://www.bnpb.go.id/berita/banjir-pantura-jawa-tengah-71479-jiwa-terdampak-dan-2440-jiwa-mengungsi",
  },
  {
    kategori: "RIWAYAT_KEJADIAN",
    idWilayah: KODE.kabSolok,
    tanggal: "2026-09-21",
    judul: "Banjir Bandang Kabupaten Solok September 2026",
    isi:
      "Banjir bandang terjadi pada Senin malam, 21 September 2026, setelah hujan berintensitas tinggi meningkatkan debit sejumlah sungai di Kabupaten Solok, Sumatra Barat, termasuk Sungai Batang Laso, dan memicu longsor di perbukitan sekitarnya. Material banjir menerjang Kompleks Perkantoran Pemerintah Kabupaten Solok dan permukiman sekitarnya. Dua orang meninggal dunia dan empat warga luka-luka.",
    sumberNama: "BNPB, 26 September 2026",
    sumberUrl: "https://www.bnpb.go.id/berita/update-banjir-bandang-solok-satu-korban-hilang-berhasil-ditemukan",
  },
];
