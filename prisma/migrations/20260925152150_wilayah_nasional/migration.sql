-- Wilayah nasional (Kemendagri 2025) + cache cuaca per sel grid 0,1°. Lihat docs/DECISIONS.md D-033–D-034.
-- Data lama tidak kompatibel: 14 wilayah ber-slug dan cache cuaca per wilayah.
-- Konten seed diisi ulang oleh `npm run db:seed`; cache cuaca & risiko diambil ulang saat dibutuhkan.
-- Cascade: level_risiko, notifikasi, langganan, konten khusus wilayah. pengguna.wilayah_preferensi → NULL.
DELETE FROM "data_cuaca";
DELETE FROM "wilayah";
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "TingkatWilayah" AS ENUM ('PROVINSI', 'KABKOTA', 'KECAMATAN', 'DESA');

-- DropForeignKey
ALTER TABLE "data_cuaca" DROP CONSTRAINT "data_cuaca_id_wilayah_fkey";

-- DropIndex
DROP INDEX "data_cuaca_id_wilayah_waktu_ambil_idx";

-- DropIndex
DROP INDEX "data_cuaca_id_wilayah_waktu_pengamatan_idx";

-- AlterTable
ALTER TABLE "data_cuaca" DROP COLUMN "id_wilayah",
ADD COLUMN     "grid_latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "grid_longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "kunci_grid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "wilayah" DROP COLUMN "kontak_darurat",
ADD COLUMN     "aktif" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "id_induk" TEXT,
ADD COLUMN     "koordinat_perkiraan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kunci_grid" TEXT,
ADD COLUMN     "level" "TingkatWilayah" NOT NULL,
ADD COLUMN     "nama_lengkap" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "data_cuaca_kunci_grid_waktu_ambil_idx" ON "data_cuaca"("kunci_grid", "waktu_ambil");

-- CreateIndex
CREATE INDEX "data_cuaca_waktu_ambil_idx" ON "data_cuaca"("waktu_ambil");

-- CreateIndex
CREATE INDEX "level_risiko_id_cuaca_id_wilayah_idx" ON "level_risiko"("id_cuaca", "id_wilayah");

-- CreateIndex
CREATE INDEX "wilayah_id_induk_aktif_idx" ON "wilayah"("id_induk", "aktif");

-- CreateIndex
CREATE INDEX "wilayah_level_koordinat_latitude_koordinat_longitude_idx" ON "wilayah"("level", "koordinat_latitude", "koordinat_longitude");

-- CreateIndex
CREATE INDEX "wilayah_kunci_grid_idx" ON "wilayah"("kunci_grid");

-- CreateIndex
CREATE INDEX "wilayah_nama_lengkap_trgm_idx" ON "wilayah" USING GIN ("nama_lengkap" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "wilayah" ADD CONSTRAINT "wilayah_id_induk_fkey" FOREIGN KEY ("id_induk") REFERENCES "wilayah"("id_wilayah") ON DELETE RESTRICT ON UPDATE CASCADE;
