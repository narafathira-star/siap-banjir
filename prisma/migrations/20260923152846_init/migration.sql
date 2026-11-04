-- CreateEnum
CREATE TYPE "TingkatRisiko" AS ENUM ('RENDAH', 'SEDANG', 'TINGGI');

-- CreateEnum
CREATE TYPE "StatusKirim" AS ENUM ('PENDING', 'TERKIRIM', 'GAGAL');

-- CreateEnum
CREATE TYPE "KategoriInformasi" AS ENUM ('UMUM', 'RIWAYAT_KEJADIAN');

-- CreateEnum
CREATE TYPE "ParameterRisiko" AS ENUM ('hujan_1jam', 'hujan_24jam', 'hujan_3hari', 'prakiraan_hujan_24jam', 'peluang_hujan_max');

-- CreateTable
CREATE TABLE "pengguna" (
    "id_pengguna" TEXT NOT NULL,
    "wilayah_preferensi" TEXT,
    "tanggal_dibuat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id_pengguna")
);

-- CreateTable
CREATE TABLE "perangkat" (
    "id_perangkat" TEXT NOT NULL,
    "id_pengguna" TEXT NOT NULL,
    "jenis_perangkat" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "device_token" TEXT NOT NULL,
    "tanggal_daftar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perangkat_pkey" PRIMARY KEY ("id_perangkat")
);

-- CreateTable
CREATE TABLE "langganan_notifikasi" (
    "id_langganan" TEXT NOT NULL,
    "id_perangkat" TEXT NOT NULL,
    "id_wilayah" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "push_subscription" JSONB NOT NULL,
    "push_endpoint" TEXT NOT NULL,
    "level_minimum" "TingkatRisiko" NOT NULL DEFAULT 'SEDANG',
    "tanggal_daftar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "langganan_notifikasi_pkey" PRIMARY KEY ("id_langganan")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id_notifikasi" TEXT NOT NULL,
    "id_langganan" TEXT NOT NULL,
    "id_level_risiko" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "waktu_kirim" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_kirim" "StatusKirim" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id_notifikasi")
);

-- CreateTable
CREATE TABLE "wilayah" (
    "id_wilayah" TEXT NOT NULL,
    "nama_wilayah" TEXT NOT NULL,
    "koordinat_latitude" DOUBLE PRECISION NOT NULL,
    "koordinat_longitude" DOUBLE PRECISION NOT NULL,
    "deskripsi" TEXT,
    "kontak_darurat" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "wilayah_pkey" PRIMARY KEY ("id_wilayah")
);

-- CreateTable
CREATE TABLE "data_cuaca" (
    "id_cuaca" TEXT NOT NULL,
    "id_wilayah" TEXT NOT NULL,
    "curah_hujan" DOUBLE PRECISION NOT NULL,
    "suhu" DOUBLE PRECISION NOT NULL,
    "kelembapan" DOUBLE PRECISION NOT NULL,
    "kondisi_cuaca" INTEGER NOT NULL,
    "kecepatan_angin" DOUBLE PRECISION NOT NULL,
    "waktu_pengamatan" TIMESTAMP(3) NOT NULL,
    "waktu_ambil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_json" JSONB NOT NULL,

    CONSTRAINT "data_cuaca_pkey" PRIMARY KEY ("id_cuaca")
);

-- CreateTable
CREATE TABLE "level_risiko" (
    "id_risiko" TEXT NOT NULL,
    "id_wilayah" TEXT NOT NULL,
    "id_cuaca" TEXT NOT NULL,
    "level" "TingkatRisiko" NOT NULL,
    "skor_risiko" INTEGER NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "parameter_pemicu" JSONB NOT NULL DEFAULT '[]',
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "level_risiko_pkey" PRIMARY KEY ("id_risiko")
);

-- CreateTable
CREATE TABLE "ambang_risiko" (
    "id_ambang" TEXT NOT NULL,
    "id_wilayah" TEXT,
    "parameter" "ParameterRisiko" NOT NULL,
    "nilai_minimum" DOUBLE PRECISION NOT NULL,
    "nilai_maksimum" DOUBLE PRECISION,
    "level_risiko" "TingkatRisiko" NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "ambang_risiko_pkey" PRIMARY KEY ("id_ambang")
);

-- CreateTable
CREATE TABLE "informasi" (
    "id_informasi" TEXT NOT NULL,
    "id_wilayah" TEXT,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "kategori" "KategoriInformasi" NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "informasi_pkey" PRIMARY KEY ("id_informasi")
);

-- CreateTable
CREATE TABLE "persiapan_dini" (
    "id_persiapan" TEXT NOT NULL,
    "id_wilayah" TEXT,
    "level_risiko" "TingkatRisiko" NOT NULL,
    "isi_persiapan" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persiapan_dini_pkey" PRIMARY KEY ("id_persiapan")
);

-- CreateTable
CREATE TABLE "rekomendasi" (
    "id_rekomendasi" TEXT NOT NULL,
    "id_wilayah" TEXT,
    "level_risiko" "TingkatRisiko" NOT NULL,
    "isi_rekomendasi" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rekomendasi_pkey" PRIMARY KEY ("id_rekomendasi")
);

-- CreateIndex
CREATE UNIQUE INDEX "perangkat_device_token_key" ON "perangkat"("device_token");

-- CreateIndex
CREATE INDEX "perangkat_id_pengguna_idx" ON "perangkat"("id_pengguna");

-- CreateIndex
CREATE UNIQUE INDEX "langganan_notifikasi_id_perangkat_key" ON "langganan_notifikasi"("id_perangkat");

-- CreateIndex
CREATE UNIQUE INDEX "langganan_notifikasi_push_endpoint_key" ON "langganan_notifikasi"("push_endpoint");

-- CreateIndex
CREATE INDEX "langganan_notifikasi_id_wilayah_status_idx" ON "langganan_notifikasi"("id_wilayah", "status");

-- CreateIndex
CREATE INDEX "notifikasi_id_langganan_waktu_kirim_idx" ON "notifikasi"("id_langganan", "waktu_kirim");

-- CreateIndex
CREATE INDEX "notifikasi_id_level_risiko_idx" ON "notifikasi"("id_level_risiko");

-- CreateIndex
CREATE INDEX "data_cuaca_id_wilayah_waktu_pengamatan_idx" ON "data_cuaca"("id_wilayah", "waktu_pengamatan");

-- CreateIndex
CREATE INDEX "data_cuaca_id_wilayah_waktu_ambil_idx" ON "data_cuaca"("id_wilayah", "waktu_ambil");

-- CreateIndex
CREATE INDEX "level_risiko_id_wilayah_waktu_idx" ON "level_risiko"("id_wilayah", "waktu");

-- CreateIndex
CREATE INDEX "ambang_risiko_id_wilayah_parameter_idx" ON "ambang_risiko"("id_wilayah", "parameter");

-- CreateIndex
CREATE INDEX "informasi_kategori_tanggal_idx" ON "informasi"("kategori", "tanggal");

-- CreateIndex
CREATE INDEX "informasi_id_wilayah_idx" ON "informasi"("id_wilayah");

-- CreateIndex
CREATE INDEX "persiapan_dini_level_risiko_id_wilayah_idx" ON "persiapan_dini"("level_risiko", "id_wilayah");

-- CreateIndex
CREATE INDEX "rekomendasi_level_risiko_id_wilayah_idx" ON "rekomendasi"("level_risiko", "id_wilayah");

-- AddForeignKey
ALTER TABLE "pengguna" ADD CONSTRAINT "pengguna_wilayah_preferensi_fkey" FOREIGN KEY ("wilayah_preferensi") REFERENCES "wilayah"("id_wilayah") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perangkat" ADD CONSTRAINT "perangkat_id_pengguna_fkey" FOREIGN KEY ("id_pengguna") REFERENCES "pengguna"("id_pengguna") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "langganan_notifikasi" ADD CONSTRAINT "langganan_notifikasi_id_perangkat_fkey" FOREIGN KEY ("id_perangkat") REFERENCES "perangkat"("id_perangkat") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "langganan_notifikasi" ADD CONSTRAINT "langganan_notifikasi_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_id_langganan_fkey" FOREIGN KEY ("id_langganan") REFERENCES "langganan_notifikasi"("id_langganan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_id_level_risiko_fkey" FOREIGN KEY ("id_level_risiko") REFERENCES "level_risiko"("id_risiko") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_cuaca" ADD CONSTRAINT "data_cuaca_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_risiko" ADD CONSTRAINT "level_risiko_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_risiko" ADD CONSTRAINT "level_risiko_id_cuaca_fkey" FOREIGN KEY ("id_cuaca") REFERENCES "data_cuaca"("id_cuaca") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ambang_risiko" ADD CONSTRAINT "ambang_risiko_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "informasi" ADD CONSTRAINT "informasi_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persiapan_dini" ADD CONSTRAINT "persiapan_dini_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rekomendasi" ADD CONSTRAINT "rekomendasi_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;
