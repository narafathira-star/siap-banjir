-- AlterTable
ALTER TABLE "informasi" ADD COLUMN     "sumber_tanggal_nama" TEXT,
ADD COLUMN     "sumber_tanggal_url" TEXT,
ADD COLUMN     "tanggal_data_per" BOOLEAN NOT NULL DEFAULT false;
