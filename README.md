# Siap Banjir

Aplikasi web untuk memantau risiko banjir dan memberi peringatan dini berdasarkan data cuaca [Open-Meteo](https://open-meteo.com/). Pengguna memilih desa/kelurahan di mana pun di Indonesia (83.762 desa/kelurahan, data Kemendagri 2025), melihat cuaca dan prakiraan, mengetahui **level risiko banjir (Rendah / Sedang / Tinggi)**, menerima **notifikasi push**, lalu mengikuti **persiapan dini** dan **rekomendasi tindakan** sesuai level. Tidak perlu login.

> Level risiko pada Siap Banjir adalah estimasi berdasarkan data cuaca Open-Meteo dan ambang batas risiko yang telah ditentukan. Informasi ini bukan peringatan resmi. Selalu ikuti arahan BMKG, BPBD, dan pemerintah setempat.

Keputusan desain dan penyimpangan dari rancangan dicatat di [docs/DECISIONS.md](docs/DECISIONS.md).

## Daftar isi

- [Fitur](#fitur)
- [Arsitektur](#arsitektur)
- [Data wilayah Indonesia](#data-wilayah-indonesia)
- [Kuota Open-Meteo](#kuota-open-meteo)
- [Setup lokal (Windows)](#setup-lokal-windows)
- [Variabel lingkungan](#variabel-lingkungan)
- [Cron: update cuaca otomatis](#cron-update-cuaca-otomatis)
- [Simulasi risiko tinggi](#simulasi-risiko-tinggi)
- [Testing](#testing)
- [Mengubah ambang & konten](#mengubah-ambang--konten)
- [Deploy ke Vercel + Neon / Supabase](#deploy-ke-vercel--neon--supabase)
- [Keamanan](#keamanan)
- [Script npm](#script-npm)
- [Atribusi & lisensi data](#atribusi--lisensi-data)

## Fitur

| Halaman | Isi |
|---|---|
| `/` Beranda | Pilih desa/kelurahan (pencarian, pilihan bertingkat Provinsi → Kab/Kota → Kecamatan → Desa/Kelurahan, atau "Gunakan lokasi saya"), kartu cuaca terkini, badge level risiko, grafik curah hujan 48 jam, tombol "Aktifkan Peringatan" |
| `/risiko` | Level + bilah skor, arti tiap level, parameter pemicu, grafik 48 jam saat state Bahaya, Detail Penanganan (Checklist Siaga + Detail Mitigasi), tautan ke Nomor Darurat. Dikendalikan state machine; refresh tiap 30 menit |
| `/kontak` | Nomor Darurat: nomor utama (112, atau BPBD bernomor resmi jika 112 belum diluncurkan; tanpa keduanya 112 didampingi nomor nasional), nomor lainnya (115, 117, 110, 119, 113, BPBD), konfirmasi sebelum menelepon, status layanan 112 dan sumber resmi |
| `/cuaca` | Cuaca terkini (suhu, kondisi, kelembapan, angin, hujan 15 menit), prakiraan harian 3 hari (kategori hujan BMKG, curah hujan, peluang, suhu), grafik per jam satu hari (hujan, peluang, suhu; tab Hari ini/Besok/Lusa, tooltip, tabel nilai) |
| `/informasi` | Tab Informasi umum / Riwayat kejadian (tersimpan di `?tab=`): artikel umum banjir (bertanggal terbit), riwayat kejadian banjir dengan tautan sumber, dan riwayat risiko tinggi otomatis per kab/kota |
| `/pengaturan` | Wilayah (pencarian, lokasi, pilihan bertingkat), sakelar peringatan banjir, level minimum (Sedang & Tinggi / hanya Tinggi), kirim notifikasi uji, catatan privasi |
| `/offline` | Halaman cadangan PWA saat tidak ada koneksi |

- **Unit pemantauan = desa/kelurahan.** Kode wilayah memakai kode Kemendagri bertitik, misal `36.71.01.1001` (Kelurahan Sukarasa, Kota Tangerang), dan tampil di URL `/risiko?wilayah=36.71.01.1001`.
- **Rule engine risiko:** ambang batas dibaca dari tabel `AmbangRisiko` (tidak di-hard-code). Ambang **diwariskan bertingkat**: desa > kecamatan > kab/kota > provinsi > global. Tingkat paling spesifik yang punya ambang untuk suatu parameter yang dipakai; wilayah tanpa ambang khusus memakai ambang global. Level akhir = level tertinggi dari semua parameter. Persiapan dini, rekomendasi, dan informasi diwariskan dengan cara yang sama.
- **Notifikasi push** (Web Push + VAPID): langganan per desa/kelurahan, anti-spam 6 jam (kecuali level naik), subscription 404/410 dihapus otomatis. Klik notifikasi membuka `/risiko?wilayah={kode}#penanganan`.
- **Riwayat:** deteksi risiko TINGGI disimpan sebagai satu entri per kab/kota per hari (WIB), berisi daftar desa/kelurahan yang terdeteksi hari itu.
- **Kontak darurat:** halaman `/kontak` berisi nomor nasional bersumber resmi (112, 115 Basarnas, 117 BNPB, 110, 119, 113), status layanan 112 kab/kota (Portal 112 Komdigi), dan BPBD kab/kota + provinsi (nomor hanya dari situs resmi). Lihat DECISIONS D-042, D-043, D-050, D-051.
- **PWA:** bisa di-install di HP, halaman yang pernah dibuka tetap tampil saat offline.
- **Cron:** hanya untuk desa/kelurahan yang punya pelanggan notifikasi: update cuaca → hitung risiko → kirim notifikasi → simpan riwayat.

## Arsitektur

```
src/
  app/(public)/          halaman (Beranda, risiko, cuaca, informasi, pengaturan, offline)
  app/api/               wilayah, cuaca, risiko, informasi, persiapan, rekomendasi (GET)
                         push/subscribe, push/unsubscribe, push/test, push/langganan
                         cron/update-weather
  components/            ui/ (shadcn), cuaca/, risiko/, notifikasi/, wilayah/, layout/
  server/
    integrations/        open-meteo.ts (ambilDataCuaca), web-push.ts
    services/            weather, risk, notification, subscription, content, wilayah,
                         kuota, pemantauan (orkestrasi sequence diagram), riwayat
    validators/          skema Zod
  lib/                   mesin-risiko.ts (state machine), kode-wilayah, grid, weather-code, format, geo, ...
  hooks/                 useWilayah, usePushSubscription, useRiskState
public/                  sw.js, manifest.json, icons/
prisma/                  schema.prisma, migrations/, seed.ts, seed-data.ts, data-wilayah.ts
  data/                  wilayah.tsv.gz, laporan-impor-wilayah.md, sumber-wilayah.json,
                         LISENSI-DATA-WILAYAH.md
tests/                   unit/, integration/, e2e/
scripts/                 impor-wilayah.ts, cron-lokal.ts, simulasi-risiko.ts, buat-ikon.mjs
```

API wilayah (semua GET):

| Endpoint | Isi |
|---|---|
| `/api/wilayah` | Daftar provinsi; `?induk={kode}` untuk anak suatu wilayah (kab/kota, kecamatan, desa/kelurahan) |
| `/api/wilayah/cari?q=` | Cari desa/kelurahan (min. 3 huruf; semua kata harus cocok dengan nama desa, kecamatan, kab/kota, atau provinsi) |
| `/api/wilayah/terdekat?lat=&lng=` | Desa/kelurahan terdekat dari titik GPS. Koordinat pengguna tidak disimpan |
| `/api/wilayah/{kode}` | Detail wilayah beserta leluhurnya |

Pemetaan UML: operasi class diagram (`hitungLevelRisiko()`, `cekAmbang()`, `ambilDataCuaca()`, `cariLanggananAktif()`, `kirimNotifikasi()`, …) adalah fungsi service di `src/server/services/`. Operasi tambah/ubah/hapus konten tidak diekspos sebagai halaman/API, hanya dipakai `prisma/seed.ts`. Aktor hanya **Pengguna** dan **Open-Meteo**; tidak ada admin atau login.

## Data wilayah Indonesia

| Tingkat | Jumlah |
|---|---|
| Provinsi | 38 |
| Kabupaten/Kota | 514 |
| Kecamatan | 7.285 |
| Desa/Kelurahan | 83.762 |

**Sumber**

- **Kode & nama:** [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) (`db/wilayah.sql`), mengikuti Kepmendagri No. 300.2.2-2430 Tahun 2025. Nama wilayah selalu diambil dari sini.
- **Koordinat:** titik tengah (centroid) poligon batas wilayah dari [cahyadsn/wilayah_boundaries](https://github.com/cahyadsn/wilayah_boundaries). Poligonnya sudah disederhanakan, jadi centroid adalah perkiraan titik tengah wilayah, bukan lokasi kantor desa. Hanya titik tengah yang disimpan; poligon tidak ikut.

**Proses impor** (`npm run data:wilayah`, hanya perlu dijalankan saat memperbarui data):

1. Mengunduh kedua sumber dari **commit yang dipin** di `scripts/impor-wilayah.ts`, sehingga hasilnya dapat diulang. Cache unduhan ada di `.cache/wilayah/`.
2. **Mencocokkan kode dengan nama.** Setiap kode Kemendagri dicari di data batas wilayah, lalu namanya dibandingkan setelah dinormalisasi. Hasilnya: `sama`, `ejaan` (beda spasi atau ejaan lama seperti oe→u dan dj→j, atau kemiripan ≥ 80%), atau `berbeda`. Koordinat hanya dipakai jika namanya `sama` atau `ejaan` dan titiknya berada di Indonesia.
3. Desa/kelurahan tanpa data batas memakai **titik tengah kecamatannya** dan ditandai `koordinatPerkiraan`. Di aplikasi muncul catatan bahwa titik pusatnya perkiraan.
4. Menulis `prisma/data/wilayah.tsv.gz` (di-commit; dibaca `npm run db:seed`), `laporan-impor-wilayah.md` (daftar semua nama yang berbeda ejaan, data yang hilang, dan wilayah yang jauh dari induknya), dan `sumber-wilayah.json`.

Hasil impor saat ini: 0 nama berbeda, 19 beda ejaan (dilaporkan, nama Kemendagri yang dipakai), dan 359 desa/kelurahan memakai koordinat kecamatan. Ada 25 wilayah yang lebih jauh dari induknya daripada batas wajar; setelah diperiksa manual, semuanya kepulauan atau kecamatan yang sangat luas, jadi koordinatnya tetap dipakai.

Wilayah yang hilang dari data baru tidak dihapus, hanya ditandai `aktif = false`, agar riwayat dan langganan lama tetap utuh.

## Kuota Open-Meteo

API gratis Open-Meteo dibatasi 10.000 call/hari (non-komersial). Satu permintaan Siap Banjir (10 variabel, satu lokasi) = 1 call. Agar tetap dalam kuota untuk seluruh Indonesia:

- **Grid 0,1° (±11 km).** Koordinat desa dibulatkan ke titik grid terdekat, dan semua desa di sel yang sama berbagi satu permintaan dan satu cache. Resolusi model cuaca Open-Meteo untuk Indonesia 9–25 km, jadi tidak ada detail yang hilang. Seluruh 83.762 desa/kelurahan terbagi ke ±13.000 sel.
- **Ambil saat dibuka.** Cuaca diminta ketika halaman desa/kelurahan dibuka, lalu di-cache 30 menit per sel.
- **Cron hanya untuk pelanggan.** Cron hanya memperbarui sel yang berisi desa/kelurahan dengan langganan notifikasi aktif, maksimal 125 sel per putaran (data tertua lebih dulu).
- **Pengaman anggaran.** Pemakaian dihitung dari jumlah `DataCuaca` 24 jam terakhir. Di atas 9.000, kunjungan halaman hanya memakai data tersimpan (label "Batas harian permintaan data cuaca hampir tercapai"); cron masih boleh sampai 9.800 karena notifikasi lebih penting. Data cuaca lebih tua dari 3 hari dihapus otomatis.

## Setup lokal (Windows)

Prasyarat: Node.js 20+ dan PostgreSQL 17. PostgreSQL diinstal langsung, tanpa Docker (DECISIONS D-001).

```powershell
# 1. PostgreSQL (sekali saja)
winget install --id PostgreSQL.PostgreSQL.17 -e --override "--mode unattended --unattendedmodeui none --superpassword postgres --serverport 5432 --disable-components stackbuilder,pgAdmin"
$env:PGPASSWORD = 'postgres'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE ROLE siapbanjir WITH LOGIN PASSWORD 'siapbanjir' CREATEDB;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE siapbanjir OWNER siapbanjir ENCODING 'UTF8';"

# 2. Aplikasi
Copy-Item .env.example .env
npm install
npm run db:migrate   # terapkan migrasi
npm run db:seed      # 91.599 wilayah dari prisma/data/wilayah.tsv.gz (±15 detik), ambang risiko, konten

# 3. Kunci Web Push (VAPID): salin publicKey → NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey → VAPID_PRIVATE_KEY
npx web-push generate-vapid-keys --json

# 4. CRON_SECRET acak
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm run dev          # http://localhost:3000
```

> PowerShell 5.1: `Set-Content -Encoding utf8` menambahkan BOM yang merusak baris pertama `.env`. Edit `.env` dengan editor teks biasa.

Notifikasi push dan PWA hanya bekerja di `localhost` atau HTTPS. Di iPhone/iPad, notifikasi push hanya tersedia setelah Siap Banjir ditambahkan ke Layar Utama (Safari → Bagikan → Tambah ke Layar Utama). Cek dengan **Pengaturan → Kirim notifikasi uji**.

## Variabel lingkungan

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | Koneksi runtime PostgreSQL. Di Neon/Supabase: URL **pooled** + `pgbouncer=true` |
| `DIRECT_URL` | ya | Koneksi langsung untuk migrasi. Lokal: sama dengan `DATABASE_URL` |
| `OPEN_METEO_BASE_URL` | tidak | Default `https://api.open-meteo.com/v1/forecast` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | untuk push | Kunci publik VAPID (boleh terlihat browser) |
| `VAPID_PRIVATE_KEY` | untuk push | Kunci privat VAPID. **Hanya di server**, jangan diberi awalan `NEXT_PUBLIC_` |
| `VAPID_SUBJECT` | untuk push | `mailto:` alamat pengelola yang asli (Apple bisa menolak alamat contoh) |
| `CRON_SECRET` | untuk cron | Minimal 16 karakter acak; tanpa ini endpoint cron selalu menolak |
| `NEXT_PUBLIC_APP_URL` | tidak | URL aplikasi, dipakai `npm run cron:lokal` |

`NEXT_PUBLIC_*` ditanam saat build; ubah nilainya → build ulang.

## Cron: update cuaca otomatis

`GET|POST /api/cron/update-weather` wajib header `Authorization: Bearer <CRON_SECRET>`. Cron mengumpulkan desa/kelurahan yang punya langganan aktif dan mengelompokkannya per sel grid. Untuk setiap sel (4 paralel), cron mengambil data cuaca (memakai cache < 30 menit), menghitung risiko setiap desa di sel itu, lalu, jika risiko baru Sedang/Tinggi, mengirim notifikasi dan menyimpan riwayat. Sel di atas batas 125 per putaran ditunda ke putaran berikutnya. Tambahkan `?paksa=1` untuk mengabaikan cache. Respons berisi ringkasan (`sel`, `diperbarui`, `ditunda`, `pemakaianKuota24Jam`, …) dan hasil per sel.

| Cara | Konfigurasi |
|---|---|
| **Lokal** | `npm run cron:lokal` di terminal kedua (memanggil sekarang lalu tiap 30 menit) |
| **Vercel Cron** | `vercel.json` sudah berisi jadwal `*/30 * * * *`. Vercel otomatis mengirim `Authorization: Bearer $CRON_SECRET` jika env `CRON_SECRET` diatur. **Paket Hobby hanya mengizinkan cron harian**; untuk 30 menit perlu Pro atau GitHub Actions |
| **GitHub Actions** | `.github/workflows/update-weather.yml`. Atur secret repo `APP_URL` (misal `https://siap-banjir.vercel.app`) dan `CRON_SECRET`. Jadwal GitHub bisa terlambat beberapa menit |

Panggil manual:

```powershell
$s = (Select-String -Path .env -Pattern '^CRON_SECRET="(.*)"').Matches.Groups[1].Value
Invoke-RestMethod "http://localhost:3000/api/cron/update-weather?paksa=1" -Headers @{ Authorization = "Bearer $s" }
```

## Simulasi risiko tinggi

Untuk melihat alur Bahaya → Detail Penanganan tanpa menunggu hujan lebat. **Ambang risiko tidak diubah.** Simulasi menyimpan nilai hujan 24 jam yang benar-benar melewati ambang level tujuan, lalu risiko desa/kelurahan dihitung dengan ambang asli (DECISIONS D-041). Kode boleh tingkat apa pun; simulasi berlaku untuk semua desa/kelurahan di bawahnya.

```powershell
npm run simulasi -- cari sukarasa tangerang                        # cari kode wilayah
npm run simulasi -- aktifkan 36.71.01.1001 TINGGI                  # hujan default: batas TINGGI + 10 mm (60 mm)
npm run simulasi -- aktifkan 36.71 SEDANG                          # semua desa/kelurahan di Kota Tangerang
npm run simulasi -- aktifkan 36.71.01.1001 TINGGI --hujan-24jam 90 # nilai sendiri (ditolak jika tidak melewati ambang)
# buka http://localhost:3000/risiko?wilayah=36.71.01.1001, atau jalankan cron
npm run simulasi -- status                                         # simulasi aktif
npm run simulasi -- pulihkan 36.71.01.1001                         # kembali ke risiko asli (--semua untuk semua)
```

Hasil simulasi selalu berlabel **[SIMULASI]** (deskripsi risiko, judul notifikasi push, toast), **tidak ditulis ke riwayat**, dan tidak menahan peringatan asli (anti-spam dihitung terpisah). Simulasi tidak memakai kuota Open-Meteo tambahan karena risiko dihitung ulang dari data cuaca yang sudah tersimpan.

> Perangkat yang berlangganan notifikasi untuk wilayah itu akan menerima **push sungguhan** berlabel [SIMULASI]. Script menolak berjalan jika `DATABASE_URL` bukan database lokal (kecuali `--izinkan-remote`).

Langkah demo lengkap (persiapan Firefox, menyalakan dan mematikan simulasi, mengulang demo, pemecahan masalah) ada di [docs/DEMO.md](docs/DEMO.md).

## Testing

| Perintah | Isi | Kebutuhan |
|---|---|---|
| `npm test` | Unit test (Vitest): rule engine risiko & pewarisan ambang, turunan parameter Open-Meteo, state machine, anti-spam, validasi endpoint push, cron & riwayat, kode wilayah, grid, pencocokan nama impor, data wilayah & seed | — |
| `npm run test:integration` | `prosesPeringatan()`, riwayat per kab/kota, pencarian & desa terdekat terhadap database asli (push di-mock) | PostgreSQL dari `.env` yang sudah di-seed. **Jangan ke database produksi** |
| `npm run test:e2e` | Playwright (Pixel 7 + Desktop Chrome): cari desa → lihat risiko → aktifkan notifikasi → atur notifikasi; pilihan bertingkat; GPS; state machine (desa disimulasikan TINGGI); deep link; PWA offline; security headers | `npm run build` lebih dulu, database ter-seed, internet (Open-Meteo) |

`npm run build`, `npm run start`, dan server e2e memakai folder `.next-prod`, sedangkan `npm run dev` memakai `.next`. Jadi build dan e2e aman dijalankan saat `npm run dev` berjalan (DECISIONS D-058). Folder lain tetap bisa dipilih lewat `NEXT_DIST_DIR`. Deploy Vercel tetap memakai `.next`.

Pertama kali: `npx playwright install chromium`. E2E menjalankan server produksi di port 3100 dan mensimulasikan risiko TINGGI di Kelurahan Bandengan, Kota Pekalongan (`33.75.03.1009`) selama test (dipulihkan otomatis). Chromium headless tidak bisa berlangganan push sungguhan, jadi `PushManager`/`Notification` di-stub; request ke server tetap asli.

## Mengubah ambang & konten

Tidak ada halaman admin (sesuai rancangan). Ambang risiko, deskripsi wilayah, informasi, persiapan dini, dan rekomendasi diatur di `prisma/seed-data.ts`, lalu:

```powershell
npm run db:seed   # idempoten: wilayah di-upsert, tabel konten diisi ulang (riwayat otomatis tidak dihapus)
```

Riwayat kejadian (`RIWAYAT_KEJADIAN`) wajib diberi `sumberNama` dan `sumberUrl` (https) yang sudah dibuka dan isinya sesuai. Utamakan sumber resmi (BNPB/BMKG, lalu instansi pemerintah lain); test `seed-data` menolak riwayat tanpa sumber atau bersumber di luar `*.go.id`. Periksa bahwa semua tautan masih bisa dibuka dengan `npm run cek:sumber` (butuh internet). Artikel `UMUM` bukan laporan kejadian: tanggalnya ditampilkan sebagai tanggal terbit.

Ambang khusus wilayah: tambahkan entri `ambangSeed` dengan `idWilayah` berupa kode Kemendagri tingkat apa pun (tambahkan kodenya ke konstanta `KODE`). Untuk parameter itu, ambang tersebut berlaku bagi semua desa/kelurahan di bawahnya, kecuali ada ambang di tingkat yang lebih spesifik. Test `seed-data` memastikan setiap kode yang dirujuk ada di data Kemendagri dan nama profilnya cocok. Ikon PWA dibuat dari logo dengan `node scripts/buat-ikon.mjs`.

## Deploy ke Vercel + Neon / Supabase

1. **Database**
   - **Neon:** buat project, lalu ambil dua connection string:
     - `DATABASE_URL` = URL *pooled* (host berakhiran `-pooler`), tambahkan `?sslmode=require&pgbouncer=true`
     - `DIRECT_URL` = URL langsung (tanpa `-pooler`), `?sslmode=require`
   - **Supabase:** Project Settings → Database:
     - `DATABASE_URL` = *Transaction pooler* (port 6543) + `?pgbouncer=true&connection_limit=1`
     - `DIRECT_URL` = *Session pooler* / direct (port 5432)
2. **Vercel:** import repo, framework Next.js.
   - **Build Command:** `npm run vercel-build` (generate Prisma Client, `prisma migrate deploy`, lalu `next build`).
   - **Environment Variables:** semua variabel di atas. `NEXT_PUBLIC_APP_URL` = domain produksi.
3. **Seed sekali** dari komputer lokal, menunjuk ke database produksi:
   ```powershell
   $env:DATABASE_URL = "<DIRECT_URL produksi>"; $env:DIRECT_URL = $env:DATABASE_URL
   npm run db:seed
   $env:DATABASE_URL = $null; $env:DIRECT_URL = $null
   ```
4. **Cron:** Vercel Cron (Pro) atau GitHub Actions (lihat [Cron](#cron-update-cuaca-otomatis)).
5. **Cek:** buka situs → pilih wilayah → aktifkan notifikasi → Pengaturan → Kirim notifikasi uji.

Catatan: rate limit memakai memori proses, sehingga di Vercel batasnya berlaku per instance (DECISIONS D-019).

## Keamanan

- Semua input API divalidasi Zod. API publik hanya GET, kecuali `push/subscribe`, `push/unsubscribe`, `push/test` (wajib `Content-Type: application/json`).
- Rate limit per IP: subscribe/unsubscribe 10/menit, notifikasi uji 3/menit, API cuaca/risiko 60/menit.
- Endpoint push dibatasi ke push service resmi browser (mencegah SSRF).
- Endpoint cron: `Authorization: Bearer CRON_SECRET`, perbandingan constant-time.
- VAPID private key hanya di env server.
- Tidak ada data pribadi: perangkat dikenali lewat token acak + push subscription.
- Security headers: CSP dasar, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`. Header `X-Powered-By` dimatikan. HSTS diatur oleh hosting (Vercel).

## Script npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run vercel-build` | Build untuk Vercel (termasuk `prisma migrate deploy`) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit test |
| `npm run test:integration` | Integration test ke database `.env` (jangan ke produksi) |
| `npm run test:e2e` | E2E Playwright (butuh build) |
| `npm run cron:lokal` | Panggil endpoint cron sekarang & tiap 30 menit |
| `npm run simulasi -- <perintah>` | Simulasi risiko (lihat di atas) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:deploy` | `prisma migrate deploy` |
| `npm run db:seed` | Isi ulang data seed (idempoten) |
| `npm run db:reset` | Hapus database, migrasi ulang, dan seed |
| `npm run db:studio` | Prisma Studio |
| `npm run data:wilayah` | Impor ulang data wilayah dari sumber (lihat [Data wilayah](#data-wilayah-indonesia)) |
| `npm run cek:sumber` | Pastikan semua tautan sumber riwayat bisa dibuka (butuh internet) |

## Atribusi & lisensi data

- **Data cuaca:** [Open-Meteo.com](https://open-meteo.com/), lisensi [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Kode & nama wilayah:** [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) (commit [`55a496d`](https://github.com/cahyadsn/wilayah/tree/55a496d3662bf173a65d6860f75ed6be625f2430)), berdasarkan Kepmendagri No. 300.2.2-2430 Tahun 2025. Lisensi **MIT**, Copyright (c) 2017-2025 Cahya DSN.
- **Koordinat wilayah:** [cahyadsn/wilayah_boundaries](https://github.com/cahyadsn/wilayah_boundaries) (commit [`3c5a796`](https://github.com/cahyadsn/wilayah_boundaries/tree/3c5a7960f4d227a38489094d84252bdbb3f978a5)). Lisensi **MIT**, Copyright (c) 2024 Cahya DSN.

Teks lengkap kedua lisensi MIT tersebut disertakan di [prisma/data/LISENSI-DATA-WILAYAH.md](prisma/data/LISENSI-DATA-WILAYAH.md), sesuai syarat lisensi bahwa pemberitahuan hak cipta dan izin wajib disertakan pada salinan data.

<details>
<summary>MIT License, cahyadsn/wilayah</summary>

```
MIT License

Copyright (c) 2017-2025 Cahya DSN

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

</details>

<details>
<summary>MIT License, cahyadsn/wilayah_boundaries</summary>

```
MIT License

Copyright (c) 2024 Cahya DSN

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

</details>
