-- CreateEnum
CREATE TYPE "BagianRekomendasi" AS ENUM ('SIAGA', 'JIKA_BANJIR');

-- AlterTable
ALTER TABLE "rekomendasi" ADD COLUMN     "bagian" "BagianRekomendasi" NOT NULL DEFAULT 'SIAGA',
ADD COLUMN     "sumber_nama" TEXT,
ADD COLUMN     "sumber_url" TEXT;
