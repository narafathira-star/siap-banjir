-- Integrity: batas nilai di level database (pertahanan terakhir jika validasi aplikasi terlewat).
-- NOT VALID = hanya memeriksa baris yang baru ditulis/diubah, sehingga data lama tidak membuat
-- migrasi gagal. Untuk memeriksa data lama juga: ALTER TABLE ... VALIDATE CONSTRAINT <nama>;

ALTER TABLE "data_cuaca"
  ADD CONSTRAINT "data_cuaca_kelembapan_rentang" CHECK ("kelembapan" >= 0 AND "kelembapan" <= 100) NOT VALID,
  ADD CONSTRAINT "data_cuaca_curah_hujan_nonnegatif" CHECK ("curah_hujan" >= 0) NOT VALID,
  ADD CONSTRAINT "data_cuaca_kecepatan_angin_nonnegatif" CHECK ("kecepatan_angin" >= 0) NOT VALID;

ALTER TABLE "level_risiko"
  ADD CONSTRAINT "level_risiko_skor_rentang" CHECK ("skor_risiko" >= 0 AND "skor_risiko" <= 100) NOT VALID;

ALTER TABLE "ambang_risiko"
  ADD CONSTRAINT "ambang_risiko_minimum_nonnegatif" CHECK ("nilai_minimum" >= 0) NOT VALID,
  ADD CONSTRAINT "ambang_risiko_maksimum_lebih_besar" CHECK ("nilai_maksimum" IS NULL OR "nilai_maksimum" > "nilai_minimum") NOT VALID;

ALTER TABLE "simulasi_cuaca"
  ADD CONSTRAINT "simulasi_cuaca_hujan_nonnegatif" CHECK ("hujan_24jam" >= 0) NOT VALID;

ALTER TABLE "wilayah"
  ADD CONSTRAINT "wilayah_latitude_rentang" CHECK ("koordinat_latitude" >= -90 AND "koordinat_latitude" <= 90) NOT VALID,
  ADD CONSTRAINT "wilayah_longitude_rentang" CHECK ("koordinat_longitude" >= -180 AND "koordinat_longitude" <= 180) NOT VALID;
