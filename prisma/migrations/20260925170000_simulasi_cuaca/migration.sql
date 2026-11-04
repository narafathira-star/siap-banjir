-- AlterTable
ALTER TABLE "level_risiko" ADD COLUMN     "simulasi" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "simulasi_cuaca" (
    "id_wilayah" TEXT NOT NULL,
    "hujan_24jam" DOUBLE PRECISION NOT NULL,
    "level_tujuan" "TingkatRisiko" NOT NULL,
    "mulai" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulasi_cuaca_pkey" PRIMARY KEY ("id_wilayah")
);

-- AddForeignKey
ALTER TABLE "simulasi_cuaca" ADD CONSTRAINT "simulasi_cuaca_id_wilayah_fkey" FOREIGN KEY ("id_wilayah") REFERENCES "wilayah"("id_wilayah") ON DELETE CASCADE ON UPDATE CASCADE;
