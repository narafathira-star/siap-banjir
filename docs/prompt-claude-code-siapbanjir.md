# PROMPT CLAUDE CODE — SIAP BANJIR

> Salin seluruh isi di bawah garis ini ke Claude Code. Setelah Fase 1 selesai, lanjutkan dengan mengetik: **"Lanjut Fase 2"**, dan seterusnya.

---

Kamu adalah senior full-stack engineer. Bangun aplikasi web **Siap Banjir**, aplikasi pemantauan risiko banjir dan peringatan dini berbasis data cuaca Open-Meteo. Rancangan sistem sudah ada dalam bentuk UML (use case, class, sequence, activity, state machine), dan implementasi **harus mengikuti rancangan tersebut**. Ringkasannya ada di bawah.

Kerjakan **bertahap per fase**. Jangan membuat semua fitur sekaligus. Di akhir setiap fase: jalankan build + test, tunjukkan ringkasan file yang dibuat, cara menjalankan, dan tunggu perintah "Lanjut Fase N" dari saya.

---

## 1. Konsep

Siap Banjir membantu masyarakat:

1. Memilih wilayah yang ingin dipantau.
2. Melihat kondisi cuaca terkini dan prakiraan (curah hujan, suhu, kelembapan, angin).
3. Mengetahui **level risiko banjir**: Rendah / Sedang / Tinggi.
4. Menerima **notifikasi push** ketika risiko Sedang atau Tinggi.
5. Melihat **persiapan dini** (checklist siaga) dan **rekomendasi tindakan** sesuai level risiko.
6. Membaca informasi umum seputar banjir dan riwayat kejadian banjir.

Pengguna masyarakat **tidak perlu login**. Identitasnya berbasis perangkat (browser) melalui Web Push subscription.

Tampilkan disclaimer di footer dan halaman risiko:

> "Level risiko pada Siap Banjir adalah estimasi berdasarkan data cuaca Open-Meteo dan ambang batas risiko yang telah ditentukan. Informasi ini bukan peringatan resmi. Selalu ikuti arahan BMKG, BPBD, dan pemerintah setempat."

---

## 2. Aktor

| Aktor | Peran |
|---|---|
| **Pengguna** | Aktor utama (masyarakat). Tanpa login, akses via web. |
| **Open-Meteo** | Aktor sekunder, API cuaca eksternal (`https://api.open-meteo.com/v1/forecast`). Gratis, tanpa API key. |

---

## 3. Use Case (wajib diimplementasikan)

**Pengguna:**

1. **Atur Lokasi Wilayah**: pilih wilayah dari daftar atau pakai lokasi GPS (cari wilayah terdekat). Simpan preferensi di localStorage + server (terkait perangkat).
2. **Atur Notifikasi**: aktif/nonaktif notifikasi, pilih level minimum yang ingin diterima (Sedang/Tinggi).
3. **Lihat Data Cuaca** «include» **Ambil Data Cuaca**: setiap kali data cuaca ditampilkan, sistem wajib memastikan data diambil dari Open-Meteo (atau dari cache yang masih segar).
4. **Terima Notifikasi**: notifikasi push saat risiko terdeteksi.
5. **Lihat Informasi**: artikel umum banjir dan kebencanaan + riwayat kejadian banjir per wilayah.
6. **Level Risiko** → **Lihat Persiapan Dini** → **Lihat Rekomendasi** (alur bertingkat: level menentukan persiapan, lalu rekomendasi).

**Sistem:**

- **Ambil Data Cuaca**: request ke Open-Meteo berdasarkan latitude/longitude wilayah.
- **Kirim Notifikasi**: kirim Web Push ke perangkat yang berlangganan pada wilayah terkait.

---

## 4. Teknologi

- **Framework:** Next.js 15 (App Router) + React + TypeScript (strict)
- **UI:** Tailwind CSS + shadcn/ui, ikon lucide-react
- **Grafik:** Recharts (grafik curah hujan dan prakiraan per jam/hari)
- **Peta (opsional, Fase 5):** Leaflet + OpenStreetMap
- **Database:** PostgreSQL + Prisma ORM
- **Validasi:** Zod
- **Push notification:** Web Push API + Service Worker + library `web-push` (VAPID keys)
- **Penjadwalan:** endpoint cron `/api/cron/update-weather` yang dilindungi `CRON_SECRET` (bisa dipanggil Vercel Cron / node-cron / GitHub Actions)
- **PWA:** manifest + service worker supaya bisa di-install di HP
- **Testing:** Vitest (unit, terutama perhitungan risiko) + Playwright (e2e alur utama)
- **Dev environment:** Docker Compose untuk PostgreSQL, `.env.example` lengkap

---

## 5. Model Data (turunan dari Class Diagram)

Buat schema Prisma dengan entitas berikut (nama tabel snake_case, field camelCase di Prisma):

| Entitas | Atribut utama | Relasi |
|---|---|---|
| **Pengguna** | idPengguna, wilayahPreferensi, tanggalDibuat | memilih 1 Wilayah; menggunakan 1..* Perangkat |
| **Perangkat** | idPerangkat, jenisPerangkat, browser, deviceToken, tanggalDaftar | memiliki 0..1 LanggananNotifikasi |
| **LanggananNotifikasi** | idLangganan, idPerangkat, idWilayah, status (bool), pushSubscription (JSON: endpoint, keys p256dh & auth), levelMinimum, tanggalDaftar | menerima 0..* Notifikasi |
| **Notifikasi** | idNotifikasi, idLangganan, idLevelRisiko, judul, pesan, waktuKirim, statusKirim (PENDING/TERKIRIM/GAGAL) | dipicu oleh LevelRisiko |
| **Wilayah** | idWilayah, namaWilayah, koordinatLatitude, koordinatLongitude, deskripsi | memiliki 0..* DataCuaca, 0..* Informasi, 0..* AmbangRisiko |
| **DataCuaca** | idCuaca, idWilayah, curahHujan, suhu, kelembapan, kondisiCuaca (weather_code), kecepatanAngin, waktuPengamatan, rawJson | menentukan 1 LevelRisiko |
| **LevelRisiko** | idRisiko, idWilayah, idCuaca, level (RENDAH/SEDANG/TINGGI), skorRisiko, deskripsi, waktu | dibandingkan dengan AmbangRisiko; memiliki 0..* PersiapanDini & Rekomendasi (via level) |
| **AmbangRisiko** | idAmbang, idWilayah (nullable = berlaku global), parameter, nilaiMinimum, nilaiMaksimum, levelRisiko, keterangan | — |
| **Informasi** | idInformasi, idWilayah (nullable), judul, isi, kategori (UMUM/RIWAYAT_KEJADIAN), tanggal | — |
| **PersiapanDini** | idPersiapan, idWilayah (nullable), levelRisiko, isiPersiapan, urutan, tanggal | — |
| **Rekomendasi** | idRekomendasi, idWilayah (nullable), levelRisiko, isiRekomendasi, urutan, tanggal | — |

Aturan:

- Pakai enum Prisma untuk `LevelRisiko` dan `StatusKirim`.
- Index pada `(idWilayah, waktuPengamatan)`, `(idWilayah, waktu)`, `(idWilayah, status)` di langganan.
- `pushSubscription.endpoint` unik.
- Konten dengan `idWilayah = null` berlaku untuk semua wilayah; jika ada konten khusus wilayah, tampilkan konten khusus lebih dulu.

Pemetaan class → kode:

- Operasi class (`hitungLevelRisiko()`, `cekAmbang()`, `ambilDataCuaca()`, `cariLanggananAktif()`, `kirimNotifikasi()`, dst.) diimplementasikan sebagai **service** di `src/server/services/`, bukan method di model Prisma.
- Class **WebSiapBanjir** (boundary) = halaman dan komponen UI.
- Class **Open-Meteo «External API»** = modul `src/server/integrations/open-meteo.ts`.

---

## 6. Integrasi Open-Meteo

Modul `open-meteo.ts`, fungsi `ambilDataCuaca(latitude, longitude)`:

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lon}
  &current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m
  &hourly=precipitation,precipitation_probability,temperature_2m
  &daily=precipitation_sum,precipitation_probability_max
  &past_days=2&forecast_days=3
  &timezone=Asia/Jakarta
```

Syarat:

- Validasi respons dengan Zod. Timeout 10 detik, retry 2x dengan backoff.
- **Cache**: jika DataCuaca terakhir untuk wilayah itu umurnya < 30 menit, pakai data dari DB (jangan spam API).
- Jika API gagal: tampilkan data terakhir yang tersimpan + label "Data terakhir diperbarui pukul HH:mm".
- Terjemahkan `weather_code` (WMO) ke label Bahasa Indonesia + ikon (Cerah, Berawan, Hujan Ringan, Hujan Lebat, Badai Petir, dst.).
- Tampilkan atribusi "Data cuaca: Open-Meteo.com" (wajib sesuai lisensi CC BY 4.0).

---

## 7. Rule Engine Risiko (inti sistem)

Service `risk.service.ts`:

```
hitungLevelRisiko(dataCuaca) -> { level, skorRisiko, parameterPemicu[] }
cekAmbang(dataCuaca, ambangList) -> hasil perbandingan per parameter
```

Logika:

1. Hitung parameter turunan dari data Open-Meteo:
   - `hujan_1jam` (mm, current precipitation)
   - `hujan_24jam` (mm, jumlah 24 jam terakhir dari hourly)
   - `hujan_3hari` (mm, akumulasi 2 hari lalu + hari ini)
   - `prakiraan_hujan_24jam` (mm, 24 jam ke depan)
   - `peluang_hujan_max` (%)
2. Ambil AmbangRisiko untuk wilayah tersebut (khusus wilayah menimpa yang global).
3. Untuk tiap parameter, cari rentang `nilaiMinimum ≤ nilai < nilaiMaksimum` → level.
4. **Level akhir = level tertinggi** dari semua parameter. `skorRisiko` = angka 0–100 untuk ditampilkan di gauge.
5. Simpan hasil ke LevelRisiko beserta parameter pemicunya (untuk ditampilkan: "Risiko TINGGI karena curah hujan 24 jam 72 mm").

**Ambang batas TIDAK boleh di-hard-code.** Semua dibaca dari tabel AmbangRisiko (diisi lewat seed, bisa diubah tanpa mengubah kode). Seed default (mengacu kategori intensitas hujan harian BMKG):

| Parameter | Rendah | Sedang | Tinggi |
|---|---|---|---|
| hujan_24jam (mm) | 0 – 20 | 20 – 50 | ≥ 50 |
| hujan_1jam (mm) | 0 – 10 | 10 – 20 | ≥ 20 |
| hujan_3hari (mm) | 0 – 60 | 60 – 120 | ≥ 120 |
| prakiraan_hujan_24jam (mm) | 0 – 20 | 20 – 50 | ≥ 50 |

Wajib ada unit test Vitest untuk kasus: semua rendah, satu parameter tinggi, batas tepat di nilai ambang, ambang khusus wilayah menimpa global, data kosong.

---

## 8. Alur Sistem (dari Sequence & Activity Diagram)

Implementasikan urutan ini persis:

1. Pengguna membuka web → sistem memanggil `lihatInformasi(wilayah)` → tampil daftar wilayah + info cuaca awal.
2. Pengguna `aturLokasi(wilayah)` → tampil **popup izin notifikasi** (custom dialog dulu, baru `Notification.requestPermission()`).
3. **alt [izin notifikasi]:** `daftarkanPerangkat()` → dapat `idPerangkat` → `aktifkan(idPerangkat, wilayah)` pada LanggananNotifikasi → "status aktif".
   **[else]:** lanjut tanpa notifikasi.
4. Ambil koordinat wilayah → `ambilDataDariAPI(wilayah)` → `ambilDataCuaca(lat, lon)` ke Open-Meteo → `simpanData()`.
5. `hitungLevelRisiko(dataCuaca)` → `cekAmbang(dataCuaca)` → level risiko.
6. `lihatPersiapan(level, wilayah)` dan `lihatRekomendasi(level, wilayah)`.
7. Tampilkan data cuaca, level risiko, persiapan dini, rekomendasi.
8. **alt [level Sedang/Tinggi]:** `buatNotifikasi(levelRisiko)` → `cariLanggananAktif(idWilayah)` (status aktif & levelMinimum terpenuhi) → `kirimNotifikasi()` via push subscription → perangkat menerima notifikasi peringatan.
   **[else]:** tidak ada notifikasi, tampilkan "informasi normal".
9. Simpan kejadian risiko tinggi sebagai riwayat (Informasi kategori RIWAYAT_KEJADIAN).

**Anti-spam notifikasi:** jangan kirim notifikasi ulang untuk wilayah + level yang sama dalam 6 jam, kecuali level naik (Sedang → Tinggi). Hapus subscription yang merespons 404/410 dari push service.

---

## 9. State Machine (perilaku di sisi klien & cron)

Implementasikan status UI berikut (boleh pakai reducer / XState):

- **Idle / Pemantauan Lokasi**: entry: ambil lokasi & data Open-Meteo. Refresh berkala tiap 30 menit.
- **EvaluasiRisiko**: Risiko < ambang → kembali ke Idle; Risiko ≥ ambang → Bahaya.
- **Bahaya Potensi Banjir Detected**: jalankan **paralel**:
  - Jalur 1: Trigger Push → Kirim Notifikasi Push → Notifikasi Terkirim.
  - Jalur 2: Permintaan Grafik → Menyiapkan Grafik → Selesai Render.
- **Join** → **Detail Penanganan**:
  - Checklist Siaga (entry: Persiapan Dini, do: tampilkan checklist interaktif yang bisa dicentang, progres disimpan di localStorage).
  - Detail Mitigasi (entry: Lihat Panduan, do: tampilkan rekomendasi & langkah mitigasi).
- **Final**: kondisi normal kembali / user dismiss / tutup website.

Klik notifikasi push harus membuka `/risiko?wilayah={id}` langsung ke Detail Penanganan.

---

## 10. Halaman

**Publik (Pengguna):**

- `/` Beranda: hero singkat, pilih wilayah, kartu cuaca terkini, **badge level risiko besar** (hijau/kuning/merah), grafik curah hujan 48 jam, tombol "Aktifkan Peringatan".
- `/risiko` Detail risiko: gauge skor, parameter pemicu, checklist persiapan dini, rekomendasi tindakan, kontak darurat (112, BPBD setempat; dari data seed).
- `/cuaca` Prakiraan 3 hari (per jam & harian).
- `/informasi` Daftar artikel + riwayat kejadian banjir; `/informasi/[id]` detail.
- `/pengaturan` Atur wilayah & notifikasi (aktif/nonaktif, level minimum, tombol "Kirim notifikasi uji").
- Halaman offline (PWA).

**Tidak ada halaman admin dan tidak ada login.** Aktor sistem hanya Pengguna dan Open-Meteo, sesuai dokumen rancangan. Data Wilayah, AmbangRisiko, Informasi, PersiapanDini, dan Rekomendasi diisi lewat `prisma/seed.ts`. Operasi tambah/ubah/hapus pada class diagram (`tambahWilayah()`, `ubahAmbang()`, `hapusRekomendasi()`, dst.) tetap dibuat sebagai fungsi service, tetapi **tidak diekspos sebagai halaman atau API publik**: cukup dipakai oleh seed script.

---

## 11. Desain UI

- Mobile-first (mayoritas pengguna buka dari HP), responsif sampai desktop.
- Warna utama biru (air/kepercayaan); status: Rendah = hijau, Sedang = kuning/amber, Tinggi = merah. **Level jangan hanya dibedakan warna**: selalu sertakan teks + ikon (aksesibilitas).
- Bahasa Indonesia sederhana, huruf besar dan jelas, kontras WCAG AA.
- Komponen: card cuaca, badge risiko, gauge, grafik, checklist, dialog izin notifikasi, toast, skeleton loading.
- Logo sederhana: tetes air + perisai/tanda peringatan.

---

## 12. Keamanan

- Semua input divalidasi Zod di server.
- API publik hanya bersifat baca (GET), kecuali subscribe/unsubscribe/pengaturan notifikasi perangkat.
- Endpoint cron dilindungi header `Authorization: Bearer ${CRON_SECRET}`.
- VAPID private key hanya di server (env).
- Endpoint subscribe/unsubscribe punya rate limit.
- Tidak menyimpan data pribadi selain yang perlu (tidak ada nama/nomor HP pengguna).
- Security headers (CSP dasar, X-Frame-Options, dll.).

---

## 13. Struktur Folder

```
src/
  app/
    (public)/            # beranda, risiko, cuaca, informasi, pengaturan
    api/
      wilayah/ cuaca/ risiko/ informasi/ persiapan/ rekomendasi/
      push/subscribe/ push/unsubscribe/ push/test/
      cron/update-weather/
  components/            # ui/, cuaca/, risiko/, notifikasi/
  server/
    db.ts
    integrations/open-meteo.ts
    services/            # weather, risk, notification, subscription, content
    validators/          # zod schemas
  lib/                   # utils, weather-code map, constants
  hooks/                 # useWilayah, usePushSubscription, useRiskState
public/
  sw.js  manifest.json  icons/
prisma/
  schema.prisma  seed.ts
tests/
  unit/  e2e/
```

---

## 14. Tahapan Pembangunan

**Fase 1: Fondasi**
Setup Next.js + TS + Tailwind + shadcn, Docker Compose PostgreSQL, schema Prisma lengkap, migrasi, seed (minimal 10 wilayah rawan banjir di Indonesia dengan koordinat akurat, ambang default, contoh informasi/persiapan/rekomendasi untuk tiap level), layout dasar + navigasi.

**Fase 2: Cuaca & Risiko**
Integrasi Open-Meteo + cache, service risiko + unit test, halaman Beranda, `/cuaca`, `/risiko` dengan grafik, persiapan dini, dan rekomendasi.

**Fase 3: Notifikasi Push**
Service worker, dialog izin, subscribe/unsubscribe, Perangkat + LanggananNotifikasi, pengiriman push, anti-spam, notifikasi uji, halaman `/pengaturan`.

**Fase 4: Cron & State Machine**
Endpoint cron update semua wilayah → hitung risiko → kirim notifikasi → simpan riwayat. Implementasi state machine UI + Checklist Siaga interaktif + deep link dari notifikasi.

**Fase 5: PWA, Hardening & Test**
Manifest, offline page, security headers, rate limit, e2e Playwright (pilih wilayah → lihat risiko → aktifkan notifikasi), README lengkap (setup lokal, generate VAPID key, konfigurasi cron, deploy ke Vercel + Neon/Supabase).

---

## 15. Aturan Kerja

- Kode bersih, modular, TypeScript strict, tanpa `any`.
- Jangan menambahkan aktor, peran, atau fitur di luar dokumen rancangan (tidak ada admin, tidak ada login).
- Jangan mengarang data wilayah: koordinat harus nyata.
- Setiap fase: jalankan `npm run build`, `npm run lint`, dan test. Perbaiki semua error sebelum lapor selesai.
- Commit per fase dengan pesan yang jelas.
- Jika ada keputusan desain yang ambigu, pilih opsi paling sederhana yang tetap sesuai UML, lalu catat di `docs/DECISIONS.md`.

**Mulai dari Fase 1 sekarang.**
