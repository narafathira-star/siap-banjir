/** Kalimat transparansi lokasi: cuaca berlaku untuk sel grid ±11 km; koordinat desa bisa perkiraan. */
export function teksCatatanLokasi(koordinatPerkiraan: boolean) {
  return (
    "Data cuaca berlaku untuk area ±11 km di sekitar wilayah ini." +
    (koordinatPerkiraan ? " Titik pusat desa/kelurahan ini belum tersedia, jadi dipakai titik pusat kecamatannya." : "")
  );
}
