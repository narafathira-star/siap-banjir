# Catatan Keputusan Desain — Siap Banjir

Keputusan yang menyimpang dari prompt atau mengisi bagian yang ambigu di rancangan.
Format: konteks → keputusan → alasan / konsekuensi.

---

## D-001 · PostgreSQL diinstal langsung di Windows, bukan Docker Compose (Fase 1)

**Konteks.** Prompt meminta Docker Compose untuk PostgreSQL, tetapi Docker tidak terpasang di mesin pengembangan.

**Keputusan.** PostgreSQL 17 dipasang langsung di Windows lewat winget:

```powershell
winget install --id PostgreSQL.PostgreSQL.17 -e --override "--mode unattended --unattendedmodeui none --superpassword postgres --serverport 5432 --disable-components stackbuilder,pgAdmin"
```

Berjalan sebagai Windows service `postgresql-x64-17` di `localhost:5432`. Role dan database aplikasi:

```powershell
$env:PGPASSWORD = 'postgres'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE ROLE siapbanjir WITH LOGIN PASSWORD 'siapbanjir' CREATEDB;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE siapbanjir OWNER siapbanjir ENCODING 'UTF8';"
```

**Alasan / konsekuensi.**
- Tidak ada `docker-compose.yml` di repo. `DATABASE_URL` di `.env.example` menunjuk ke instalasi lokal.
- Role `siapbanjir` diberi `CREATEDB` karena `prisma migrate dev` perlu membuat shadow database.
- Password `postgres` / `siapbanjir` hanya untuk pengembangan lokal. Service hanya menerima koneksi dari localhost (bawaan `pg_hba.conf` installer EDB).
- Jika nanti Docker tersedia, cukup tambah `docker-compose.yml` dengan kredensial yang sama. Kode aplikasi tidak perlu diubah.

## D-002 · Prisma 6, bukan versi terbaru

Tag `latest` di npm menunjuk ke rilis kandidat Prisma 8 dan Prisma 7 mengubah cara konfigurasi (driver adapter, `prisma.config.ts`). Dipakai **Prisma 6.19** (stabil, `prisma-client-js`, `url = env("DATABASE_URL")`) supaya setup tetap sederhana.

## D-003 · Nama enum level risiko = `TingkatRisiko`

Prompt meminta enum Prisma untuk `LevelRisiko`, tetapi `LevelRisiko` juga nama entitas (model) di class diagram, dan Prisma tidak mengizinkan nama yang sama. Enum dinamai `TingkatRisiko` (RENDAH/SEDANG/TINGGI). Model `LevelRisiko` tetap sesuai UML.

## D-004 · Kolom `pushEndpoint` terpisah untuk keunikan endpoint

Constraint unik tidak bisa dipasang pada properti di dalam kolom JSON lewat Prisma. `LanggananNotifikasi` menyimpan `pushSubscription` (JSON utuh sesuai UML) **dan** salinan `pushEndpoint` (`String @unique`).

## D-005 · `idWilayah` berupa slug

> **Diganti D-033:** `idWilayah` kini kode Kemendagri bertitik (misal `33.74.02.1002`).

`Wilayah.idWilayah` adalah slug (misal `kota-semarang`), bukan cuid atau angka. ID jadi stabil antar-seed dan terbaca di URL `/risiko?wilayah=kota-semarang`. Entitas lain memakai `cuid()`.

## D-006 · Atribut tambahan di luar class diagram

> **Sebagian diganti D-034 & D-037:** kolom `Wilayah.kontakDarurat` dihapus (kontak dibuat dari hierarki wilayah), dan `DataCuaca` kini milik sel grid, bukan wilayah.

Ditambahkan seperlunya untuk memenuhi kebutuhan di prompt:

| Model | Atribut | Alasan |
|---|---|---|
| `Wilayah` | `kontakDarurat` (JSON `[{nama, telepon}]`) | Halaman `/risiko` wajib menampilkan kontak darurat "dari data seed"; class diagram tidak punya tempat untuk itu. |
| `DataCuaca` | `waktuAmbil` | Umur cache 30 menit dihitung dari waktu data diambil, bukan `waktuPengamatan` (waktu pengamatan Open-Meteo bisa lebih lama). |
| `LevelRisiko` | `parameterPemicu` (JSON) | Prompt meminta parameter pemicu disimpan untuk ditampilkan ("Risiko TINGGI karena curah hujan 24 jam 72 mm"). |

`AmbangRisiko.parameter` memakai enum `ParameterRisiko`. `nilaiMaksimum` boleh null, artinya tanpa batas atas (rentang "≥ 50").

## D-007 · Nomor BPBD tidak diisi

> **Diperbarui D-043:** nomor BPBD boleh diisi jika bersumber resmi terverifikasi.

Nomor telepon BPBD per daerah berbeda-beda dan sering berubah. Supaya tidak mengarang data, seed hanya mengisi **nama** BPBD dengan `telepon: null`, ditambah nomor darurat nasional (112, 117 BNPB, 119, 113). Jika telepon null, UI mengarahkan pengguna ke 112 atau situs resmi BPBD. Nomor BPBD bisa ditambahkan lewat seed setelah diverifikasi.

## D-008 · Riwayat kejadian di seed

> **Diperbarui D-039:** setiap riwayat kini punya tautan sumber yang sudah diperiksa, dan beberapa isi/tanggal dikoreksi agar sesuai sumbernya.

Riwayat kejadian (Informasi `RIWAYAT_KEJADIAN`) hanya memuat peristiwa banjir besar yang terdokumentasi luas. ~~Deskripsinya sengaja umum, tanpa angka korban atau kerugian. Satu-satunya angka adalah curah hujan 377 mm/hari di Halim Perdanakusuma (1 Januari 2020, data BMKG).~~ Sejak D-039, angka (termasuk korban) hanya dicantumkan jika disebut sumber resmi yang dirujuk. Angka 377 mm dihapus karena tidak ditemukan di halaman BMKG/BNPB yang bisa dibuka (hanya di berita yang mengutip BMKG).

## D-009 · Seed memakai service konten

Operasi class diagram `tambahWilayah()`, `ubahAmbang()`, `hapusRekomendasi()`, dan seterusnya ada di `src/server/services/content.service.ts`, divalidasi dengan Zod, dan hanya dipanggil oleh `prisma/seed.ts`. Seed bersifat idempoten: wilayah di-upsert, sedangkan tabel konten dikosongkan lalu diisi ulang.

Sejak D-033, `tambahWilayah()` menerima banyak wilayah sekaligus (upsert massal SQL per 1.000 baris), `hapusWilayah()` menandai `aktif = false` alih-alih menghapus, dan seed tidak menghapus riwayat otomatis (D-038).

## D-010 · Git dipasang via winget

Git belum terpasang saat Fase 1 dikerjakan. Git 2.55 dipasang dengan `winget install --id Git.Git -e`, lalu repo diinisialisasi dengan branch `main`. Identitas commit diatur di level repo (bukan global). `core.autocrlf=true` supaya file teks tetap LF di repo.

## D-011 · Wilayah terpilih: query `?wilayah=` → cookie → localStorage (Fase 2)

Prompt meminta preferensi wilayah disimpan di localStorage + server. Server component tidak bisa membaca localStorage, jadi preferensi juga ditulis ke cookie `siapbanjir_wilayah`. Urutan prioritas saat merender:

1. Query `?wilayah=` (deep link notifikasi `/risiko?wilayah={id}` dan URL yang bisa dibagikan).
2. Cookie.

`SinkronWilayah` menyalin localStorage ke cookie jika cookie hilang. Penyimpanan ke server (`Pengguna.wilayahPreferensi`) dibuat di Fase 3 bersama pendaftaran perangkat.

Sejak D-033, nilai yang diterima hanya kode Kemendagri yang formatnya valid. Halaman menampilkan cuaca/risiko hanya untuk kode desa/kelurahan aktif; kode tingkat lebih tinggi (misal dari tautan) hanya mengisi pemilih bertingkat. Cookie berisi slug lama dari sebelum D-033 diabaikan, sehingga pengguna diminta memilih ulang.

## D-012 · `hujan_1jam` = maks(current.precipitation, hourly jam terakhir)

Prompt mendefinisikan `hujan_1jam` sebagai "current precipitation". Respons Open-Meteo menunjukkan `current.interval = 900`, artinya `current.precipitation` hanya jumlah **15 menit** terakhir. Supaya tetap bermakna "1 jam", dipakai nilai terbesar dari `current.precipitation` dan nilai hourly pada jam penuh terakhir (nilai hourly jam T = hujan selama T-1 s.d. T).

Jendela parameter lain dihitung dari jam penuh saat ini:
- `hujan_24jam`: 24 nilai hourly sampai jam sekarang.
- `prakiraan_hujan_24jam`: 24 nilai hourly setelahnya.
- `hujan_3hari`: `daily.precipitation_sum` 2 hari lalu + hari ini. Nilai hari ini mencakup prakiraan sisa hari, sesuai definisi prompt.
- `peluang_hujan_max`: maksimum `precipitation_probability` hourly 24 jam ke depan.

Parameter tanpa data (semua null) dihilangkan, bukan dianggap 0.

## D-013 · Skor risiko 0–100 per pita level

Supaya gauge selalu konsisten dengan level, skor dipetakan per pita: RENDAH 0–33, SEDANG 34–66, TINGGI 67–100. Di dalam pita, skor naik linear sesuai posisi nilai di rentang ambangnya. Untuk rentang tanpa batas atas, skor penuh tercapai saat nilai = 2 × nilaiMinimum. Skor akhir = skor tertinggi dari semua parameter.

`peluang_hujan_max` tidak punya ambang di seed, jadi tidak memengaruhi level (hanya ditampilkan). Menambah ambangnya cukup lewat seed, tanpa mengubah kode.

## D-014 · `parameterPemicu` menyimpan semua parameter

Kolom `LevelRisiko.parameterPemicu` menyimpan hasil **semua** parameter (`nilai`, `level`, `skor`, `ambangKhusus`) dengan flag `pemicu: true` untuk parameter yang menentukan level akhir. Dengan begitu halaman `/risiko` bisa menampilkan semua nilai sesuai ambang yang berlaku saat risiko dihitung, tanpa menghitung ulang.

## D-015 · `pemantauan.service.ts` sebagai orkestrator

Selain lima service di prompt (weather, risk, notification, subscription, content), ada `pemantauan.service.ts` yang merangkai langkah 4–7 sequence diagram: data cuaca (cache/API) → `evaluasiDanSimpanRisiko` → persiapan & rekomendasi. Satu `LevelRisiko` dibuat per `DataCuaca`, sehingga data dari cache tidak menambah baris risiko baru. Fungsi murni (turunan parameter, `cekAmbang`, `hitungLevelRisiko`, penyusun data grafik) dipisah dari fungsi yang mengakses DB agar bisa di-unit-test.

## D-016 · Checklist persiapan sudah interaktif di Fase 2

Checklist persiapan dini di `/risiko` sudah bisa dicentang dan progresnya disimpan di localStorage (per wilayah + level). Hal ini bagian dari "Checklist Siaga" di state machine Fase 4, tetapi komponennya sederhana dan dibutuhkan halaman `/risiko` sekarang. Fase 4 tinggal menyambungkannya ke state machine.

## D-017 · Identitas perangkat & kapan data disimpan di server (Fase 3)

- `Perangkat.deviceToken` = UUID acak (`crypto.randomUUID()`) yang dibuat browser dan disimpan di localStorage. Tidak ada data pribadi.
- Tanpa login, perangkat tidak bisa dikaitkan satu sama lain. Jadi satu `Pengguna` dibuat per perangkat (relasi 1..* di UML tetap didukung schema).
- Sesuai sequence diagram, `daftarkanPerangkat()` hanya dipanggil pada cabang **[izin notifikasi]**. Pengguna yang menolak izin tidak punya data di server; preferensi wilayahnya hanya di localStorage + cookie. `Pengguna.wilayahPreferensi` diperbarui setiap perangkat mendaftar atau mengganti wilayah.
- Jika browser memberi endpoint yang sama ke perangkat baru (misal localStorage dihapus), langganan lama dengan endpoint itu dihapus agar `pushEndpoint` tetap unik.

## D-018 · Endpoint push dibatasi ke push service resmi (anti-SSRF)

Server mengirim POST ke `subscription.endpoint`. Tanpa pembatasan, siapa pun bisa mendaftarkan URL internal (misal `http://169.254.169.254/...`) dan menjadikan server alat SSRF. Endpoint wajib `https` tanpa port khusus, dengan host:
- `fcm.googleapis.com`: Chrome, Opera, Samsung Internet
- `updates.push.services.mozilla.com`: Firefox
- `web.push.apple.com`: Safari
- `*.notify.windows.com`: Edge desktop

Browser dengan push service lain perlu ditambahkan ke daftar di `src/server/validators/push.ts`.

## D-019 · Rate limit di memori proses

`/api/push/subscribe` dan `/unsubscribe` dibatasi 10 permintaan/menit per IP, `/api/push/test` 3/menit per IP. Implementasinya fixed window di memori (`src/lib/rate-limit.ts`), cukup untuk satu instance server. Di Vercel (banyak instance serverless), batas berlaku per instance. Jika perlu batas global, ganti dengan store bersama (misal Upstash Redis) di Fase 5.

IP dibaca dari `x-forwarded-for`, yang hanya bisa dipercaya di belakang proxy tepercaya (Vercel/Nginx).

## D-020 · Perilaku notifikasi

- **Aktif/nonaktif** di Pengaturan mengubah `LanggananNotifikasi.status`. Subscription browser tidak dihapus, sehingga menyalakan kembali tidak perlu izin ulang. `/api/push/subscribe` juga dipakai untuk memperbarui wilayah dan level minimum (upsert).
- **Level minimum** hanya `SEDANG` (Sedang + Tinggi) atau `TINGGI`. Risiko Rendah tidak pernah dikirim.
- **Pemicu (langkah 8):** setiap kali `LevelRisiko` baru bernilai Sedang/Tinggi, `prosesPeringatan()` dijalankan lewat `after()` dari Next.js. Pengiriman berlangsung setelah respons terkirim, sehingga halaman tidak menunggu push service. Fase 4 menambahkan cron agar ini berjalan tanpa ada yang membuka web.
- **Anti-spam:** notifikasi dilewati jika dalam 6 jam terakhir langganan itu sudah menerima (status PENDING/TERKIRIM) notifikasi untuk wilayah yang sama dengan level ≥ level sekarang. Notifikasi GAGAL tidak dihitung, jadi percobaan berikutnya tetap dikirim.
- **Push service 404/410:** langganan dihapus beserta riwayat notifikasinya (cascade).
- **Notifikasi uji** tidak dicatat di tabel `Notifikasi`, karena `idLevelRisiko` wajib diisi dan notifikasi uji tidak terkait level risiko.
- **Dialog izin kustom** muncul otomatis sekali setelah memilih wilayah (jika izin browser belum pernah diminta). Setelah itu pengguna bisa mengaktifkan dari tombol di Beranda atau Pengaturan.
- **Ikon notifikasi** sementara memakai `/icon.svg`. Ikon PNG dibuat di Fase 5 bersama manifest PWA.

## D-022 · Cron: satu endpoint, tiga cara memanggil (Fase 4)

`GET|POST /api/cron/update-weather` memproses semua wilayah (4 paralel). Untuk tiap wilayah: data cuaca → hitung risiko → jika risiko **baru** dan Sedang/Tinggi, kirim notifikasi + simpan riwayat.

- **Cache tetap dihormati.** Jika pengguna membuka web 10 menit sebelumnya, cron memakai data itu dan tidak menindaklanjuti ulang, karena tindak lanjut sudah dijalankan saat risiko pertama dihitung. `?paksa=1` memaksa ambil ulang dari Open-Meteo.
- **Otorisasi:** `Authorization: Bearer ${CRON_SECRET}`, dibandingkan constant-time (hash SHA-256). Secret kosong atau kurang dari 16 karakter selalu ditolak.
- **Cara memanggil:**
  - `vercel.json`: Vercel Cron setiap 30 menit. Paket Hobby Vercel hanya mengizinkan cron harian; untuk 30 menit perlu Pro atau GitHub Actions.
  - `.github/workflows/update-weather.yml`: GitHub Actions, dengan secret `APP_URL` & `CRON_SECRET`.
  - `npm run cron:lokal`: penjadwal lokal memakai `setInterval`, tanpa dependensi `node-cron` karena kebutuhannya hanya satu interval tetap.
- **Race condition diterima:** jika cron dan kunjungan halaman bersamaan menemukan cache kedaluwarsa, bisa tercipta dua `DataCuaca`. Anti-spam menghitung notifikasi PENDING sehingga duplikat notifikasi sangat kecil kemungkinannya.

## D-023 · Riwayat otomatis risiko tinggi (langkah 9)

> **Diganti D-038:** satu entri per **kab/kota** per hari, berisi daftar desa/kelurahan.

Setiap `LevelRisiko` baru bernilai TINGGI disimpan sebagai `Informasi` kategori `RIWAYAT_KEJADIAN`, **maksimal satu per wilayah per hari kalender WIB**. Deteksi berikutnya di hari yang sama tidak menambah entri. Entri otomatis dikenali dari awalan judul "Risiko banjir TINGGI terdeteksi di …", jadi schema tidak perlu diubah. Isinya menyebut parameter pemicu dan menegaskan bahwa ini **deteksi otomatis, bukan laporan kejadian banjir terverifikasi**, supaya tidak tercampur dengan riwayat kejadian nyata dari seed.

## D-024 · State machine sebagai reducer (tanpa XState)

> **Dilengkapi D-048:** kapan grafik 48 jam (jalur 2) tampil di halaman Risiko.

State machine UI ada di `src/lib/mesin-risiko.ts` sebagai reducer murni. Unit test mencakup semua transisi, termasuk join jalur paralel. Efeknya dijalankan hook `useRiskState`. Pemetaan ke UML:

| UML | Implementasi |
|---|---|
| Idle / Pemantauan Lokasi | `pemantauan`; entry ambil data (SSR awal, lalu `/api/risiko` + `/api/cuaca`); refresh tiap 30 menit dan saat tab aktif lagi setelah ≥ 30 menit |
| EvaluasiRisiko | *Choice state* di reducer (`evaluasiRisiko`), diputuskan saat data diterima |
| Bahaya, jalur 1 (TriggerPush → KirimNotifikasiPush → NotifikasiTerkirim) | Push dikirim **server** (cron / saat risiko dihitung) karena API publik tidak boleh punya endpoint tulis tambahan. Di klien, jalur ini menentukan kanal: `push` jika perangkat berlangganan untuk wilayah ini, selain itu `dalam-aplikasi` (toast + banner + tombol aktifkan notifikasi) |
| Bahaya, jalur 2 (PermintaanGrafik → MenyiapkanGrafik → SelesaiRender) | Grafik curah hujan 48 jam memanggil `onSelesaiRender` setelah tergambar di layar |
| Join → Detail Penanganan | Otomatis setelah kedua jalur selesai, lalu halaman bergulir ke bagian Penanganan |
| Checklist Siaga / Detail Mitigasi | Tab di Detail Penanganan; checklist tersimpan di localStorage (D-016) |
| Final | `selesai` dengan alasan `normal` (refresh menemukan risiko < ambang) atau `ditutup` (pengguna menutup). "Tutup website" = komponen unmount |

Perilaku tambahan:
- Peringatan yang **ditutup** tidak muncul lagi untuk level yang sama, tetapi muncul lagi jika level naik.
- Level naik Sedang → Tinggi saat masih bahaya memulai episode Bahaya baru.
- Setelah Final, refresh berikutnya memulai siklus pemantauan baru.
- Ambang bahaya di klien = Sedang, sama dengan level yang memicu notifikasi.

## D-025 · Deep link notifikasi memakai fragmen `#penanganan`

URL notifikasi: `/risiko?wilayah={id}#penanganan`. Path dan query tetap persis seperti di prompt; fragmen dibaca di browser dan memicu event `BUKA_PENANGANAN`, sehingga state machine langsung masuk Detail Penanganan (jalur 1 dianggap selesai karena notifikasi sudah diterima). Jika saat dibuka risiko sudah di bawah ambang, halaman tetap di Pemantauan.

Beranda dan `/cuaca` juga diperbarui otomatis tiap 30 menit (`router.refresh()`).

## D-026 · Script simulasi risiko

> **Diganti D-041:** simulasi tidak lagi menurunkan ambang. Nilai hujan simulasi dinilai dengan ambang asli, dan hasilnya ditandai simulasi (tanpa riwayat, notifikasi berlabel [SIMULASI]).

`npm run simulasi -- aktifkan <wilayah> [TINGGI|SEDANG]` memasang `AmbangRisiko` khusus wilayah (`id = simulasi-<wilayah>`, `hujan_24jam ≥ 0 mm` → level pilihan) dan membuat cache cuaca wilayah itu kedaluwarsa. Karena ambang dibaca dari DB, tidak ada kode yang diubah atau diberi mode khusus.

`pulihkan` menghapus ambang simulasi, riwayat otomatis sejak simulasi dimulai (waktu mulai disimpan di `keterangan`), dan data cuaca sejak itu (cascade ke `LevelRisiko` & `Notifikasi`). Pengaman:
- menolak `DATABASE_URL` non-lokal kecuali `--izinkan-remote`;
- memperingatkan jumlah pelanggan aktif, karena mereka menerima push sungguhan.

Script ini juga dipakai global setup/teardown e2e.

Sejak D-033/D-034: kode boleh tingkat apa pun (ambang diwariskan ke desa di bawahnya, D-037); yang dibuat kedaluwarsa/dihapus adalah data cuaca **sel grid** desa-desa itu, dan riwayat yang dibersihkan adalah riwayat kab/kota terkait. Perintah `cari <kata kunci>` menggantikan daftar semua wilayah di `status`. Keterbatasan: baris desa simulasi yang ditambahkan ke riwayat kab/kota yang **sudah ada sebelum simulasi** tidak ikut terhapus.

## D-027 · PWA (Fase 5)

- **Manifest:** `public/manifest.json` (sesuai struktur folder di prompt), `display: standalone`.
- **Ikon:** 192/512 (`any`), maskable 512 (logo di zona aman 60%), apple-touch-icon 180, badge monokrom 72 untuk notifikasi Android. Ikon dibuat dari logo SVG dengan `scripts/buat-ikon.mjs` memakai `sharp` bawaan Next.js; PNG hasilnya ikut di-commit.
- **Service worker** (`public/sw.js`):
  - Precache `/offline`, manifest, ikon, dan semua aset `/_next/static` yang dirujuk HTML `/offline`, supaya halaman offline bisa hydrate tanpa jaringan.
  - Navigasi: *network-first*; salinan terakhir 30 halaman disimpan dan dipakai saat offline, selain itu tampil `/offline`.
  - `/_next/static` & `/icons`: *cache-first* (nama file berhash).
  - API tidak di-cache SW, karena data risiko harus segar. Halaman yang tampil saat offline tetap menampilkan label waktu pembaruan terakhir.
  - Aset yang dimuat sebelum SW aktif (kunjungan pertama) dikirim halaman ke SW lewat `postMessage` untuk di-cache.
  - Mode dev (`sw.js?dev=1`) tidak memakai cache agar hot reload tidak terganggu.
- **Registrasi:** SW didaftarkan di semua halaman (`DaftarServiceWorker`), tidak hanya saat push aktif, agar PWA tetap bisa di-install dan dipakai offline di browser yang tidak mendukung push.
- **Tanpa tombol "Pasang aplikasi" kustom:** browser menampilkan prompt install bawaannya sendiri.

## D-028 · CSP dasar dengan `'unsafe-inline'` untuk script

Prompt meminta "CSP dasar". CSP berbasis nonce di Next.js mengharuskan semua halaman dirender dinamis dengan middleware, dan tidak cocok dengan halaman `/offline` yang disajikan dari cache SW (nonce lama tidak lagi valid). Jadi dipakai:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self';
manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

`'unsafe-eval'` dan `ws:` hanya di mode dev. Risiko XSS tetap rendah karena React meng-escape semua output, tidak ada `dangerouslySetInnerHTML`, dan tidak ada skrip pihak ketiga (font di-host sendiri oleh `next/font`).

Header lain: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (geolokasi hanya `self`), `COOP: same-origin`, `X-Powered-By` dimatikan. HSTS diserahkan ke hosting (Vercel mengaktifkannya untuk domain HTTPS).

## D-029 · E2E Playwright & bug yang ditemukannya

- Dua project: Pixel 7 (mobile-first) dan Desktop Chrome. `workers: 1` karena berbagi satu server, satu database, dan rate limit per IP.
- **Stub di browser:** Chromium headless tidak bisa berlangganan ke push service dan selalu melaporkan `Notification.permission = "denied"`. Karena itu `Notification.permission`/`requestPermission` dan `PushManager.subscribe/getSubscription` di-stub dengan subscription sintetis. Semua request ke server (subscribe, pengaturan, DB) tetap asli.
- Alur Bahaya diuji dengan simulasi (D-026) pada `kota-pekalongan` di global setup; teardown memulihkan simulasi dan menghapus perangkat uji.
- `reducedMotion: "reduce"`: aplikasi menghormati `prefers-reduced-motion` (tanpa smooth scroll).
- **Bug nyata yang ditemukan dan diperbaiki:**
  1. **Dialog izin tidak pernah muncul** jika wilayah dipilih sebelum status push selesai dimuat. Sekarang permintaan ditunda sampai status siap.
  2. **Halaman offline crash:** chunk `app/(public)/offline/page-*.js` tidak ter-precache karena regex SW berhenti di tanda kurung route group.
  3. **Overflow horizontal di mobile:** tombol "Aktifkan notifikasi push untuk wilayah ini" (`whitespace-nowrap`) mendorong tombol ✕ keluar banner. Ada test baru yang memeriksa tidak ada scroll horizontal di halaman utama.
  4. **Tertutup header saat digulir:** elemen yang digulir otomatis bisa tertutup header sticky/bottom nav. Diperbaiki dengan `scroll-padding` global.

## D-030 · Deploy: `directUrl` & `vercel-build`

- Schema Prisma memakai `directUrl = env("DIRECT_URL")`. Neon/Supabase melayani runtime lewat pooler (PgBouncer, butuh `pgbouncer=true`), sedangkan migrasi butuh koneksi langsung. Lokal: kedua URL sama.
- `npm run vercel-build` = `prisma generate && prisma migrate deploy && next build`. Atur sebagai Build Command di Vercel. Seed produksi dijalankan manual sekali (README).

## D-031 · Rate limit API baca cuaca/risiko

`/api/cuaca` dan `/api/risiko` bisa memicu request ke Open-Meteo saat cache kedaluwarsa, jadi dibatasi 60 permintaan/menit per IP (mekanisme sama dengan D-019). API baca lain hanya membaca DB dan tidak dibatasi.

## D-032 · Temuan `npm audit` yang tidak diperbaiki

`npm audit --omit=dev` (per 25 September 2026) melaporkan:

| Paket | Tingkat | Jalur | Penilaian |
|---|---|---|---|
| `postcss` (di dalam `next`) | high | Build-time: memproses CSS milik proyek | Input bukan dari pengguna, tidak bisa dieksploitasi saat runtime. Perbaikan butuh **Next 16**, sedangkan prompt meminta Next 15 |
| `deepmerge-ts` via `@prisma/config` / `prisma` | high | CLI Prisma (penggabungan konfigurasi) | Tidak di jalur request. "Perbaikan" npm justru downgrade ke Prisma 6.12 |

Keduanya dipantau; perbarui saat Next 15.x / Prisma 6.x merilis patch, atau saat proyek pindah ke Next 16.

## D-021 · Integration test memakai database pengembangan

`npm run test:integration` menjalankan `prosesPeringatan()` terhadap PostgreSQL dari `.env`, dengan push service di-mock. Test membuat datanya sendiri di wilayah `kota-pekalongan` dan menghapusnya lagi. Namun test juga **menonaktifkan langganan lain di wilayah itu**, jadi jangan dijalankan terhadap database produksi.

Sejak D-033: wilayah uji adalah desa/kelurahan asli (Kelurahan Bandengan `33.75.03.1009` untuk notifikasi; Kelurahan Belakang Pondok & Parak Gadang Timur di Kota Padang untuk riwayat per kab/kota). `DataCuaca` uji memakai sel grid `0.0,0.0` (laut, tanpa desa) agar tidak tercampur cache nyata. Ditambah test pencarian desa, desa terdekat, dan pemilih bertingkat terhadap data Kemendagri di database.

---

## D-033 · Cakupan seluruh Indonesia: data wilayah Kemendagri

**Konteks.** Cakupan diperluas dari 14 wilayah pilihan ke seluruh Indonesia: Provinsi → Kab/Kota → Kecamatan → Desa/Kelurahan, dengan kotak pencarian dan "Gunakan lokasi saya" ke desa/kelurahan terdekat.

**Keputusan.**
- **Kode & nama:** [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) (`db/wilayah.sql`, Kepmendagri No. 300.2.2-2430/2025), commit dipin `55a496d`. `idWilayah` = kode bertitik (`36.71.01.1001`); tingkat ditentukan dari jumlah segmen. Kolom baru: `level` (enum `TingkatWilayah`), `idInduk` (relasi ke diri sendiri), `namaLengkap` (desa, kecamatan, kab/kota, provinsi; untuk pencarian), `koordinatPerkiraan`, `kunciGrid`, `aktif`.
- **Koordinat:** centroid poligon dari [cahyadsn/wilayah_boundaries](https://github.com/cahyadsn/wilayah_boundaries), commit dipin `3c5a796`. Hanya centroid yang disimpan. Poligon sumber sudah disederhanakan, jadi centroid adalah perkiraan titik tengah wilayah.
- **Pencocokan kode ↔ nama saat impor** (`scripts/impor-wilayah.ts`, `scripts/lib/cocok-nama.ts`): nama dinormalisasi (huruf kecil, singkatan Kab./Kec./Kel./Ds., tanda baca), lalu dikelompokkan `sama` / `ejaan` / `berbeda`. `ejaan` mencakup beda spasi, ejaan lama (oe→u, dj→j, tj→c, ch→kh), atau kemiripan Levenshtein ≥ 0,8. Koordinat dipakai hanya jika `sama`/`ejaan` dan berada di kotak batas Indonesia. Nama **selalu** dari Kemendagri.
- **Data yang hilang:** desa/kelurahan tanpa data batas memakai centroid kecamatannya, `koordinatPerkiraan = true`, dan UI menampilkan catatan. Pencarian GPS mengutamakan desa dengan koordinat asli.
- **"Jauh dari induk" hanya dilaporkan.** Impor pertama menandai wilayah yang centroidnya > 80 km (desa) / > 250 km (kecamatan) dari induknya. Setelah diperiksa manual, semua kasus sah secara geografis: pulau terpencil (misal Kec. Liukang Tangaya & Liukang Tupabbiring di Kab. Pangkajene dan Kepulauan, Kec. Tambelan di Kab. Bintan, Pekajang di Kab. Lingga, Mapia di Kab. Supiori, pulau-pulau Babar & Masela di Kab. Maluku Barat Daya) atau kecamatan yang sangat luas (Kab. Kapuas Hulu, Kab. Kapuas). Karena itu koordinatnya tetap dipakai dan hanya dicantumkan di laporan.
- **Hasil disimpan di repo:** `prisma/data/wilayah.tsv.gz` (±1,3 MB) + `laporan-impor-wilayah.md` + `sumber-wilayah.json`. Seed dan deploy tidak butuh internet atau GitHub. Lisensi MIT kedua sumber disalin di `prisma/data/LISENSI-DATA-WILAYAH.md` dan README.
- **Pencarian:** `ILIKE` per kata terhadap `namaLengkap`, dibantu index GIN trigram (`pg_trgm`, tersedia di PostgreSQL lokal, Neon, dan Supabase). Minimal 3 huruf, rate limit sama dengan D-031.
- **Wilayah yang hilang dari data baru** ditandai `aktif = false` (tidak dihapus) agar langganan dan riwayat lama tetap utuh.

**Hasil impor (25 September 2026).** 38 provinsi, 514 kab/kota, 7.285 kecamatan, 83.762 desa/kelurahan. Tidak ada kode tambahan/ganda, **0 nama berbeda**, 19 beda ejaan (3 kecamatan, 16 desa; nama Kemendagri yang dipakai), 359 desa/kelurahan memakai koordinat kecamatan, dan 25 wilayah jauh dari induk (sah, lihat di atas).

**Konsekuensi.** Migrasi `20260925152150_wilayah_nasional` **mengosongkan** tabel `wilayah` dan `data_cuaca`. Karena cascade, semua langganan, level risiko, notifikasi, dan konten per wilayah lama ikut terhapus; konten dibuat ulang oleh seed dengan kode baru. Pengguna yang sudah berlangganan harus memilih desa/kelurahan dan mengaktifkan notifikasi lagi.

## D-034 · `DataCuaca` per sel grid 0,1° (menyimpang dari UML)

**Konteks.** Di class diagram, `DataCuaca` milik `Wilayah`. Dengan 83.762 desa/kelurahan, satu request per desa tidak mungkin dalam kuota gratis Open-Meteo (D-035).

**Keputusan.** `DataCuaca` tidak lagi berelasi ke `Wilayah`. Kolom `idWilayah` diganti `kunciGrid` (misal `-6.2,106.6`), `gridLatitude`, dan `gridLongitude`. Koordinat desa dibulatkan ke 0,1° (±11 km), dan semua desa di satu sel berbagi satu request dan satu cache 30 menit. Relasi ke wilayah dijaga lewat `LevelRisiko`: satu `LevelRisiko` per (desa, `DataCuaca`), karena ambang tiap desa bisa berbeda (D-037).

**Alasan.** Resolusi model Open-Meteo untuk Indonesia 9–25 km, jadi dua desa dalam satu sel 11 km hampir selalu mendapat nilai yang sama. Sel 0,1° menghemat request tanpa kehilangan detail. Seluruh desa/kelurahan terbagi ke ±13.000 sel. UI menjelaskan bahwa data cuaca berlaku untuk area ±11 km.

## D-035 · Anggaran kuota Open-Meteo

**Konteks.** Open-Meteo gratis: 10.000 call/hari (non-komersial). Satu request Siap Banjir (≤ 10 variabel, satu lokasi) = 1 call.

**Keputusan** (`src/server/services/kuota.service.ts`):
- Pemakaian = jumlah `DataCuaca` dengan `waktuAmbil` 24 jam terakhir (setiap request sukses = satu baris), tanpa tabel penghitung tambahan.
- Kunjungan halaman boleh meminta data baru sampai pemakaian 9.000. Di atas itu, halaman memakai data tersimpan terakhir dengan label "Batas harian permintaan data cuaca hampir tercapai" (`sumber = "hemat-kuota"`).
- Cron hanya memproses sel yang berisi desa dengan langganan aktif, maksimal 125 sel per putaran (±6.000/hari pada jadwal 30 menit), data tertua lebih dulu. Cron boleh memakai kuota sampai 9.800 karena notifikasi lebih penting daripada kunjungan.
- `DataCuaca` lebih tua dari 3 hari dihapus di akhir tiap putaran cron (cascade ke `LevelRisiko` & `Notifikasi`; anti-spam hanya melihat 6 jam terakhir).

**Konsekuensi.** Jika pelanggan tersebar di lebih dari 125 sel dengan cache kedaluwarsa, sebagian sel diperbarui di putaran berikutnya (paling lambat ±1 jam untuk ≤ 250 sel). Hitungan tidak memasukkan request yang gagal; selisih kecil ini tertutup oleh margin 200 call.

## D-036 · Variabel `rain` dihapus dari request Open-Meteo

`current.rain` tidak dipakai perhitungan mana pun (curah hujan memakai `precipitation`). Menghapusnya membuat request tetap ≤ 10 variabel, sehingga dihitung 1,0 call, bukan 1,1.

## D-037 · Pewarisan ambang & konten bertingkat, kontak darurat otomatis

**Konteks.** Prompt: wilayah tanpa ambang khusus memakai ambang global. Dengan hierarki 4 tingkat, ambang khusus sebaiknya bisa dipasang di kab/kota atau provinsi tanpa mengisi puluhan ribu desa.

**Keputusan.**
- **Ambang:** untuk setiap parameter, dipakai ambang dari tingkat **paling spesifik** yang punya ambang untuk parameter itu: desa > kecamatan > kab/kota > provinsi > global (`pilihAmbangEfektif`). Ambang antartingkat tidak dicampur. Parameter tanpa ambang khusus di tingkat mana pun memakai ambang global.
- **Persiapan dini, rekomendasi, informasi:** konten milik wilayah itu dan semua leluhurnya ditampilkan, yang paling spesifik lebih dulu, ditambah konten global.
- **Kontak darurat:** kolom `Wilayah.kontakDarurat` dihapus. Kontak dibuat dari hierarki: nomor nasional (112, 117, 119, 113) + "BPBD {kab/kota}" tanpa nomor (D-007). Kota/kabupaten administrasi DKI Jakarta tidak punya BPBD sendiri, jadi dipakai "BPBD Provinsi Daerah Khusus Ibukota Jakarta".
- **Unit pemantauan = desa/kelurahan.** Cuaca, risiko, langganan, dan notifikasi selalu per desa/kelurahan. Tingkat di atasnya hanya untuk navigasi, pewarisan, dan riwayat.
- Deskripsi wilayah dari seed lama dipindah ke kode Kemendagri yang sesuai (`profilWilayahSeed`); test memastikan nama profil sama persis dengan nama Kemendagri.

## D-038 · Riwayat risiko tinggi per kab/kota per hari

**Konteks.** D-023 menyimpan satu riwayat per wilayah per hari. Dengan unit desa, hujan lebat di satu kota bisa menghasilkan puluhan entri sehari.

**Keputusan.** Satu entri `RIWAYAT_KEJADIAN` per **kab/kota** per hari kalender WIB (`idWilayah` = kode kab/kota), berjudul "Risiko banjir TINGGI terdeteksi di {kab/kota}". Isinya daftar desa/kelurahan yang terdeteksi hari itu beserta jam dan penyebabnya. Desa yang sudah tercantum tidak ditambahkan lagi. Penulisan diserialkan dengan `pg_advisory_xact_lock(hashtext('riwayat:{kab}:{hari}'))` di dalam transaksi, sehingga cron paralel dan kunjungan halaman tidak membuat entri ganda (diuji di integration test). `npm run db:seed` tidak menghapus riwayat otomatis.

## D-039 · Sumber untuk setiap riwayat kejadian (menyimpang dari UML)

**Konteks.** Riwayat kejadian banjir di halaman Informasi harus bisa dirujuk. Class diagram `Informasi` tidak punya atribut sumber.

**Keputusan.**
- `Informasi` mendapat dua kolom nullable, `sumberNama` dan `sumberUrl` (migrasi `20260925160000_sumber_informasi`). Validator hanya menerima URL `https`. Tautan dibuka di tab baru dengan `rel="noopener noreferrer"`.
- Di kartu daftar, judul menjadi tautan ke detail (area klik meluas ke seluruh kartu) dan sumber menjadi tautan terpisah di atasnya, karena tautan bersarang tidak valid di HTML.
- **Sumber resmi diutamakan.** Semua riwayat seed kini merujuk situs pemerintah (diuji: host `*.go.id`): tujuh ke rilis BNPB, dan Banjir Jakarta 2007 ke arsip Dinas Perpustakaan dan Kearsipan Provinsi DKI Jakarta (kejadian ini sebelum BNPB berdiri pada 2008; artikel sejarah BNPB tentang 2007 berstatus 404). Teks dan tanggal disesuaikan dengan isi halaman resmi: Kalsel dimulai 12 Januari 2021, Jakarta 1 Februari 2007, Samarinda per laporan BNPB 12 Juni 2019 (penyebab: luapan Sungai Bengkuring), Semarang tanpa klaim Stasiun Tawang (tidak disebut BNPB), dan Jabodetabek 2020 dipindah ke Provinsi DKI Jakarta tanpa angka 377 mm (lihat D-008). Tidak ada halaman BMKG yang memuat data kejadian ini dalam bentuk teks.
- **Tautan harus bisa dibuka.** `npm run cek:sumber` membuka setiap tautan sumber (user agent browser, coba ulang sekali) dan gagal jika ada yang tidak terbuka; per 25 September 2026 kesembilan tautan (8 riwayat + Open-Meteo) berstatus 200. Tidak dijalankan di `npm test` karena butuh internet. Catatan: domain `bnpb.go.id` tanpa `www` menolak sebagian klien (403), jadi dipakai `www.bnpb.go.id`.
- **Setiap riwayat seed wajib punya sumber** (diuji). Setiap URL dibuka dan isinya dicocokkan pada 25 September 2026. Teks riwayat hanya memuat hal yang disebut sumbernya. Koreksi versi pertama (sebelum diganti sumber resmi):
  - Banjir Samarinda Juni 2019: frasa "terutama di sekitar Sungai Karang Mumus" dihapus karena tidak ada sumber terverifikasi yang menyebutnya; diganti kawasan yang disebut sumber (Sempaja Timur, Gunung Lingai).
  - Banjir Medan: tanggal 4 → 3 Desember 2020 (puncak banjir menurut data BNPB); Sungai Denai dan empat kecamatan terdampak ditambahkan sesuai sumber.
  - Banjir Jakarta 2007 dipindah dari Jakarta Utara ke Provinsi DKI Jakarta, dan Banjir Kalsel 2021 dari Kota Banjarmasin ke Provinsi Kalimantan Selatan, karena sumbernya menggambarkan kejadian tingkat provinsi. Lewat pewarisan (D-037) riwayat ini tampil untuk semua desa/kelurahan di provinsi itu.
- **Riwayat otomatis** (D-038) diberi sumber "Deteksi otomatis Siap Banjir, data cuaca Open-Meteo" → `https://open-meteo.com/`. Entri lama diisi saat `npm run db:seed`.
- **Artikel umum bukan kejadian.** "Banjir Luapan Citarum di Cekungan Bandung" (kategori UMUM, 10 Jan 2026) bukan laporan kejadian: tanggalnya hanya urutan tanggal terbit seed, dan isinya penjelasan risiko umum. Judulnya diganti menjadi "Mengenal Risiko Banjir Luapan Citarum di Cekungan Bandung", ditambah kalimat bahwa artikel ini bukan laporan kejadian pada tanggal tertentu. Semua artikel umum kini menampilkan label "Terbit" di depan tanggal.

## D-040 · `NEXT_DIST_DIR` untuk build/e2e saat `next dev` berjalan

`next build` menulis ke `.next`, yang juga dipakai `next dev`, sehingga build saat server pengembangan berjalan bisa merusaknya. `next.config.ts` kini membaca `distDir` dari `NEXT_DIST_DIR` (default `.next`). Contoh: `$env:NEXT_DIST_DIR = ".next-e2e"; npm run build; npm run test:e2e`. Path `.next-e2e/types` sudah ada di `tsconfig.json`, sehingga Next.js tidak menulis ulang file itu. Folder `.next-*` diabaikan git dan ESLint.

Catatan Windows: `prisma generate` gagal dengan `EPERM` saat `next dev` memegang file engine. File client (JS & tipe) tetap diperbarui; engine yang lama tetap valid selama versi Prisma sama. `next dev` memuat client baru setelah worker-nya dimulai ulang (misalnya setelah `next.config.ts` berubah, atau server di-restart).

Catatan migrasi: `prisma migrate dev` memberi timestamp UTC, sedangkan dua migrasi sebelumnya bernama dengan jam lebih akhir. Folder migrasi baru diganti nama (`…160000_…`, `…170000_…`) sebelum diterapkan agar urutan leksikalnya benar.

## D-041 · Simulasi memakai nilai hujan, bukan menurunkan ambang (menyimpang dari UML)

**Konteks.** Simulasi D-026 memasang ambang `hujan_24jam ≥ 0 mm → TINGGI`. Akibatnya notifikasi berbunyi "Risiko TINGGI karena curah hujan 24 jam terakhir 0,5 mm", tidak berlabel simulasi, dan menulis riwayat Kabupaten Sleman seolah kejadian nyata.

**Keputusan.**
- **Ambang tidak diubah.** Tabel alat uji `SimulasiCuaca` (`idWilayah`, `hujan24Jam`, `levelTujuan`, `mulai`; di luar class diagram) menyimpan nilai hujan 24 jam simulasi untuk suatu kode wilayah dan semua desa di bawahnya (yang paling spesifik menang). Saat risiko desa dihitung, `hujan_24jam` = maks(asli, simulasi) dan `hujan_3hari` minimal sama. Parameter lain tetap data asli, dan level ditentukan oleh ambang asli.
- **Nilai default benar-benar melewati ambang:** TINGGI = batas bawah TINGGI yang berlaku + 10 mm (60 mm untuk ambang global ≥ 50 mm); SEDANG = tengah rentang SEDANG. `--hujan-24jam <mm>` bisa dipakai, tetapi script menolak nilai yang tidak menghasilkan level tujuan.
- **`LevelRisiko.simulasi`** (kolom tambahan) menandai hasilnya:
  - deskripsi diawali `[SIMULASI]`, sehingga halaman dan API ikut berlabel;
  - judul notifikasi push diawali `[SIMULASI]`, isinya "Ini simulasi uji, bukan kondisi cuaca sebenarnya.", dan tag-nya `simulasi-risiko-{kode}` agar tidak menggantikan peringatan asli di perangkat;
  - toast dalam aplikasi juga berlabel;
  - **tidak pernah ditulis ke riwayat** (`simpanRiwayatRisikoTinggi` langsung keluar);
  - anti-spam 6 jam menghitung notifikasi simulasi dan asli **terpisah**, sehingga simulasi tidak menahan peringatan asli.
- **Tanpa kuota tambahan.** `risikoDesa` menghitung ulang risiko dari `DataCuaca` yang sama jika status simulasi berbeda dari risiko terakhir. Cache tidak perlu dibuat kedaluwarsa, dan tidak ada request Open-Meteo tambahan.
- **`pulihkan`** menghapus baris `SimulasiCuaca` dan `LevelRisiko` simulasi (beserta catatan notifikasinya). Riwayat dan data cuaca asli tidak disentuh, dan kunjungan berikutnya memakai lagi risiko asli.

**Pembersihan.** Simulasi Sariharjo (`34.04.12.2001`) cara lama dipulihkan: ambang `simulasi-34.04.12.2001`, riwayat "Risiko banjir TINGGI terdeteksi di Kabupaten Sleman" (satu-satunya riwayat otomatis di database), dan dua data cuaca sel `-7.7,110.4` sejak simulasi dihapus.

**Diuji:** unit (`terapkanSimulasi`, judul/isi/tag notifikasi) dan integrasi (simulasi tingkat kecamatan diwariskan ke desa, ambang tidak berubah, push berlabel, riwayat tidak bertambah, pulihkan kembali ke risiko asli, anti-spam terpisah).

## D-042 · Status layanan 112 per kab/kota dari Portal 112 Komdigi

**Konteks.** Kontak darurat selalu menampilkan 112, padahal layanan 112 diselenggarakan per kab/kota dan belum semua daerah memilikinya.

**Keputusan.**
- **Sumber:** peta "Penyelenggaraan Layanan Panggilan Darurat 112" di [layanan112.komdigi.go.id](https://layanan112.komdigi.go.id/). `npm run data:112` (`scripts/impor-layanan-112.ts`) membaca `/get/list_server` (kode kab/kota di peta) dan `/get/detail_server/{kode}` (status, tanggal). Portal menolak klien non-browser (HTTP 403), jadi skrip membuka portal lewat Chromium Playwright dan mengirim permintaan satu per satu dengan jeda 300 ms. Hasilnya di-commit ke `src/data/layanan-112.json` (termasuk `diambilPada`), dengan laporan di `prisma/data/laporan-impor-layanan-112.md`.
- **Arti status.** Portal tidak memberi label di data. Label diambil dari legenda peta (Sudah Launching, Uji Coba, Verifikasi, Dalam Pengajuan, Belum Permohonan). Status 1 = "Sudah Launching" dipastikan dari kode JS portal (`if(value.status == '1')` → "Sudah Launching {tgl_launching}"). Status 3–5 cocok dengan `/get/detail_status_launching/{id}`. Status 2 disebut "Buka Akses" oleh endpoint itu, dan mengikuti legenda dipakai label "Uji Coba". **Hanya status 1 yang dianggap sudah punya layanan 112.**
- **Tanggal:** tanggal launching hanya disimpan untuk status 1. Arti kolom tanggal untuk status lain tidak dijelaskan portal. Portal tidak mencantumkan "data per", jadi yang ditampilkan adalah tanggal pengambilan data.
- **Pencocokan kode.** Kode portal (`3209`) diubah ke format Kemendagri (`32.09`), lalu namanya dicocokkan (tanpa kata "Administrasi" yang dipakai Kemendagri untuk DKI Jakarta). 11 nama hanya beda ejaan. Kabupaten Toba Samosir berganti nama menjadi Toba (daftar `GANTI_NAMA` di skrip). Kabupaten Raja Ampat (`9205` di portal) kini `96.03` setelah pemekaran Papua Barat Daya, dan dipakai karena satu-satunya kab/kota bernama sama. Per 27 September 2026: 240 kab/kota di peta, semuanya cocok; 145 Sudah Launching, 64 Uji Coba, 9 Verifikasi, 21 Dalam Pengajuan.
- **Tidak disimpan:** nama/kontak PIC, nomor permohonan, dan data lain di detail portal. Yang disimpan hanya kode, nama di portal, status, dan tanggal launching.
- **Tampilan.** Nomor 112 tetap tampil sebagai nomor nasional, dengan keterangan untuk kab/kota wilayah terpilih: "sudah diluncurkan sejak {tanggal}", "masih berstatus {status}", atau "belum tercatat memiliki layanan 112". Dua keterangan terakhir ditambah "Jika tidak tersambung, hubungi nomor darurat lain di bawah". Aplikasi tidak mengklaim 112 pasti tidak bisa dipakai di daerah itu. Sumber dan tanggal pengambilan ditampilkan sebagai tautan.

**Diuji:** semua kode di data ada di daftar kab/kota Kemendagri, tidak ganda, tanggal launching wajib untuk status 1 dan kosong untuk status lain, serta ketiga variasi keterangan.

## D-043 · Nomor BPBD hanya dari sumber resmi terverifikasi

**Konteks.** D-007 tidak mengisi nomor BPBD. Kebutuhan baru: nomor boleh diisi, tetapi hanya jika ada sumber resmi.

**Keputusan.** `src/data/kontak-bpbd.ts` (`KONTAK_BPBD`, kunci = kode kab/kota atau provinsi pemilik BPBD) menyimpan `telepon`, `sumberNama`, `sumberUrl`, dan `diperiksaPada`. Tes mewajibkan URL `https` dengan domain `*.go.id` dan tanggal pemeriksaan. Nomor yang ada ditampilkan bersama tautan sumber dan tanggal pemeriksaannya. Selain itu ditampilkan "Nomor belum tersedia". **Buku Saku bukan sumber nomor.** Tabel "BPBD Provinsi Se-Indonesia" di Buku Saku BNPB (hal. 83–91) berasal dari 2019–2020. Nomor darurat yang salah berbahaya, jadi tabel itu hanya dipakai sebagai petunjuk. Nomor ditampilkan hanya jika cocok dengan situs resmi BPBD yang **masih aktif**, dan sumber serta tanggal pemeriksaannya dicatat.

- **Kontak ditampilkan dua tingkat:** BPBD kab/kota lalu BPBD provinsi (DKI Jakarta hanya provinsi). Masing-masing berisi nomor jika terverifikasi, selain itu "Nomor belum tersedia".
- **DIY (diperiksa 27 September 2026).** Petunjuk dari buku (hal. 85): 0274-555584 / 0274-555585 / 0274-555326. Di [bpbd.jogjaprov.go.id](https://bpbd.jogjaprov.go.id/beranda), footer "Pusdalops BPBD DIY" memuat *Phone (0274) 555585* dan *whatsapp (0274) 555584*, dan tombol "Lapor via WA" mengarah ke `62274555584`. Situs dianggap aktif karena berita terbarunya bertanggal 24 September 2026. Yang dipakai: **(0274) 555585**, dengan keterangan WhatsApp (0274) 555584. 0274-555326 dari buku kini tercatat sebagai nomor fax, dan nomor kantor di situs, (0274) 555836, berbeda dari buku. Keduanya tidak dipakai.
- **Provinsi lain dan semua BPBD kab/kota** tetap "Nomor belum tersedia" sampai dicocokkan dengan cara yang sama.
- `npm run cek:sumber` membuka halaman sumber setiap nomor BPBD dan **gagal jika nomornya tidak lagi tercantum** di halaman itu (spasi disamakan dulu). Dengan begitu, nomor yang berubah di situs resmi akan ketahuan.

## D-044 · Detail Mitigasi dari Buku Saku BNPB, dengan halaman sumber (menyimpang dari UML)

**Konteks.** Isi Detail Mitigasi (rekomendasi) sebelumnya ditulis sendiri tanpa sumber. Isinya harus berasal dari panduan resmi BNPB dan mencantumkan halaman sumbernya.

**Sumber yang diperiksa.**
- *Pengenalan Karakteristik Bencana dan Upaya Mitigasinya di Indonesia* (BAKORNAS PB, edisi II 2007, `bnpb.go.id/.../pubs/470.pdf`) **tidak dipakai**. Bab banjirnya (hal. 17–25) berisi mitigasi kelembagaan (POKJA, SATLAK, tanggul, pengerukan), bukan langkah untuk warga. Bagian yang menyangkut warga hanya "Peranserta Masyarakat" (hal. 24–25), dan lembaga yang disebut sudah tidak ada sejak BNPB berdiri pada 2008.
- **Dipakai:** *Buku Saku Tanggap Tangkas Tangguh Menghadapi Bencana* (BNPB, ISBN 978-602-5693-05-2), [PDF di www.bnpb.go.id](https://www.bnpb.go.id/storage/app/media/Buku%20BNPB/Buku%20Saku%20Bencana%20BNPB.pdf). Bab Banjir dibagi Prabencana (hal. 33–35), Saat Bencana (hal. 36–37), dan Pascabencana (hal. 38–39). Catatan edisi: halaman impresum mencantumkan cetakan keempat Maret 2019, tetapi isinya menyebut peristiwa Juli 2020 (Satgas COVID-19), jadi file ini revisi yang lebih baru tanpa impresum yang diperbarui. Edisi 2012 (`pubs/478.pdf`) tidak dipakai karena lebih lama.

**Keputusan.**
- `Rekomendasi` mendapat kolom `bagian` (`SIAGA` | `JIKA_BANJIR`, default `SIAGA`), `sumberNama`, dan `sumberUrl` (migrasi `20260927120000_sumber_rekomendasi`). Validator hanya menerima URL `https` dan menolak `JIKA_BANJIR` di luar level TINGGI.
- **Level risiko adalah potensi banjir, bukan banjir yang sedang terjadi.** Pemetaan: RENDAH → kesiapsiagaan prabencana (hal. 33–35); SEDANG → persiapan evakuasi prabencana dan memantau informasi (hal. 33–34, 36); TINGGI → siaga evakuasi (hal. 36–37), ditambah bagian terpisah **"Jika banjir terjadi"** dari panduan saat bencana (hal. 36–37).
- **Pascabencana** (hal. 38–39) menjadi artikel Informasi UMUM "Setelah Banjir Surut: Langkah Aman Menurut BNPB", sehingga selalu bisa dibuka tanpa bergantung level. Bagian "Jika banjir terjadi" menautkan ke halaman Informasi.
- Setiap butir adalah parafrase dekat dari buku dan tidak menambah hal yang tidak disebut buku. `sumberNama` diakhiri halaman cetak ("…, hal. 36"). `sumberUrl` memakai `#page=` ke halaman PDF, yaitu halaman cetak + 2 (diuji). UI menampilkan tautan halaman per butir dan nama dokumen sekali di bawah daftar.
- Rekomendasi lama tanpa sumber dihapus, termasuk "Hubungi 112 …": kontak darurat sudah punya bagian sendiri (D-042).
- Artikel "Nomor Darurat yang Perlu Disimpan" ditambah keterangan bahwa 112 diselenggarakan per kab/kota dan statusnya tampil di Kontak darurat.
- `npm run cek:sumber` ikut memeriksa dokumen sumber rekomendasi (sekali per dokumen).

## D-045 · Plus Jakarta Sans lewat `next/font`, variabel di `<html>`

Font teks diganti dari Geist ke **Plus Jakarta Sans** (`next/font/google`, font variabel 200–800, `display: swap`, di-host sendiri saat build). Geist Mono tetap dipakai untuk `--font-mono`.

**Bug lama yang ikut diperbaiki:** kelas variabel `next/font` sebelumnya dipasang di `<body>`, padahal Tailwind menerapkan `font-family: var(--font-sans)` di `<html>`. Di `<html>` variabelnya tidak terdefinisi, sehingga seluruh aplikasi selama ini tampil dengan font sistem, dan Geist tidak pernah terpakai. Kelas variabel kini dipasang di `<html>`. Sudah diperiksa di browser: `font-family` di `<html>` = `"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"`, dan fontnya berstatus `loaded`.

## D-046 · Desain ulang: Beranda dan shell aplikasi

> **Sebagian diganti D-050:** tombol Darurat dan kartu kontak Beranda kini ke halaman Nomor Darurat (`/kontak`).

**Sumber desain.** Kanvas "Siap Banjir — Desain Ulang" (artefak Design di aplikasi Claude). Beranda punya tiga board (Risiko Rendah/Sedang/Tinggi), yang ternyata satu komponen dengan parameter `level`. Desain dibaca dari berkas board-nya, dan kanvas tidak diubah.

**Keputusan.**
- **Token warna mengikuti kanvas** (`globals.css`, mode terang): latar `#F3F5F9`, teks `#0E1726`, biru utama `#1742C9`, garis `#D5DCE6`, merah darurat `#B4141C`. Tiap level punya warna solid, tint, garis, dan teks: Rendah `#0A6B31`, Sedang `#F5C400` dengan teks `#1B1600`, Tinggi `#B4141C`. Blok `.dark` tidak diubah karena tidak ada kode yang mengaktifkannya.
- **Shell global** (dipakai semua halaman): logo perisai dengan tetes air, tombol **Darurat** merah di header, bottom nav dengan penanda pil untuk menu aktif, dan footer berisi disclaimer + atribusi Open-Meteo. Baris "Darurat? Hubungi 112" dihapus dari footer karena digantikan tombol Darurat.
- **Beranda:** wilayah dipantau (→ Pengaturan), kartu level (badge + jam data, ilustrasi air 3D, skala tiga level, deskripsi, ajakan ke halaman Risiko), kartu Cuaca terkini (→ Cuaca) dan Peringatan dini (→ Pengaturan), serta kartu Kontak darurat yang merah penuh saat level Tinggi.
  - **Judul kartu level memakai `deskripsi` asli dari mesin risiko** (mis. "Risiko TINGGI karena curah hujan 24 jam terakhir 60 mm."), bukan teks contoh di kanvas. Kalimat tindakan dan teks tombol per level mengikuti kanvas (`GAYA_LEVEL.ringkasan` / `ajakan`). `pesan` yang dipakai halaman Risiko belum diubah.
  - "Hujan 24 jam" = nilai parameter `hujan_24jam` dari perhitungan risiko, diwarnai sesuai level parameter itu. Ikon cuaca mengikuti kode cuaca asli.
  - Risiko hasil simulasi (D-041) diberi kotak "SIMULASI: level ini hasil uji coba…" di kartu level.
  - Data cadangan/hemat kuota tetap diberi peringatan (`StatusData`) di bawah kartu level.
  - Kartu Peringatan dini menampilkan status perangkat (Aktif + levelnya, Belum aktif, Nonaktif, Izin ditolak, Tidak tersedia). Kalau statusnya "Belum aktif", kartu langsung membuka dialog izin.
  - **Tanpa wilayah terpilih** (tidak ada di kanvas): Beranda menampilkan pemilih wilayah seperti sebelumnya, supaya pengguna baru tidak perlu pindah ke Pengaturan dulu.
  - Grafik 48 jam, kartu cuaca lengkap, dan tombol peringatan lama dihapus dari Beranda, sesuai kanvas. Grafik ada di halaman Cuaca. `KartuRingkasanRisiko` dan `TombolAktifkanPeringatan` dihapus karena tidak dipakai lagi.
- **Ilustrasi air** di-port langsung dari kanvas (CSS 3D transform, tanpa library): tinggi air 4/10/20 px dan 0/14/26 tetes hujan untuk Rendah/Sedang/Tinggi. Diberi keterangan "Ilustrasi level risiko, bukan ketinggian air sebenarnya". Semua animasi dimatikan saat `prefers-reduced-motion`.
- **Aksesibilitas:** `h1` tersembunyi "Siap Banjir: Beranda", skala level berupa `<ol>` dengan `aria-current="step"` dan teks "Saat ini" (tidak hanya warna), ilustrasi diberi `role="img"` + label, dan fokus keyboard ditandai outline biru 3 px.
- **Sementara:** tombol Darurat dan kartu Kontak darurat mengarah ke `/risiko#kontak-darurat`. Keduanya akan diarahkan ke halaman Kontak ketika board "Nomor Darurat" diimplementasikan.

**Diuji:** e2e alur utama disesuaikan (wilayah dipantau → Pengaturan, ilustrasi, skala, hujan 24 jam, kontak). Ada tes baru untuk Beranda risiko tinggi (badge, label simulasi, ajakan penyelamatan, kartu kontak merah → bagian kontak). Assertion dibatasi ke `#konten` karena selama streaming isi Suspense sempat ada di template tersembunyi di akhir `<body>`.

## D-047 · Desain ulang: halaman Risiko

> **Sebagian diganti D-050:** bagian kontak darurat kini kartu merah ke halaman Nomor Darurat (`/kontak`).

**Sumber desain.** Board "Risiko" di kanvas "Siap Banjir — Desain Ulang" (satu board, digambar untuk level Rendah). Kanvas tidak diubah.

**Keputusan.**
- **Header:** judul "Risiko Banjir" (`h1`, sebelumnya "Detail Risiko Banjir"), subjudul, dan baris wilayah dengan tautan "Ubah" ke Pengaturan. Pemilih wilayah hanya tampil jika belum ada wilayah terpilih, sama seperti Beranda (D-046). Nama kecamatan/induk tidak lagi ditampilkan, sesuai board.
- **Disclaimer** kuning versi ringkas ("Estimasi dari data cuaca, bukan peringatan resmi…"). Kalimat lengkap tetap ada di footer setiap halaman.
- **Status pemantauan** berupa pil (label state machine) dengan tombol "Perbarui" bergaris.
- **Kartu level:** badge, `deskripsi` asli mesin risiko sebagai judul (seperti Beranda, bukan teks contoh board), `pesan` per level, **bilah skor linear 0–100** menggantikan gauge setengah lingkaran (`GaugeRisiko` dan `BadgeRisiko` dihapus), lalu "Diperbarui HH:MM WIB · Data cuaca berlaku untuk area ±11 km…". Kotak SIMULASI (D-041) dan peringatan data cadangan/hemat kuota tetap ada.
- **"Apa arti setiap level?"** (`<details>` terbuka) dengan teks dari board (`GAYA_LEVEL.arti`). Ditambah chevron sebagai penanda bisa dilipat.
- **Parameter pemicu:** nilai + pil level (Rendah = ikon centang). Tanda "Pemicu" dan "Memakai ambang khusus wilayah" dipertahankan.
- **Penanganan:** tab segmented (tetap `role="tab"`). Checklist memakai checkbox native 22 px dan bilah progres hijau, seperti board. Detail Mitigasi memakai daftar bernomor dari board. Di board, baris kedua tiap butir berisi status checklist, tetapi rekomendasi (BNPB, D-044) bukan butir checklist yang sama. Karena itu baris kedua diisi **tautan halaman sumber**, dan kalimat board "Tandai yang sudah dilakukan di tab Checklist Siaga" tidak dipakai.
- **Grafik curah hujan 48 jam tidak ada di board.** Kapan grafik tampil di halaman Risiko diatur D-048.
- **Sementara:** board menampilkan kartu merah "Lihat nomor darurat" yang menuju halaman Kontak. Halaman itu belum ada, jadi bagian `#kontak-darurat` masih berisi daftar kontak lengkap (D-042/D-043) dengan gaya kartu baru. Bagian ini akan diganti tautan saat board "Nomor Darurat" diimplementasikan.

**Diuji:** e2e alur utama disesuaikan (judul, baris wilayah + "Ubah wilayah", bilah skor, arti level). Tes state machine kini memeriksa grafik tampil di Detail Penanganan dan hilang setelah peringatan ditutup (Final).

## D-048 · Grafik 48 jam di halaman Risiko hanya saat Bahaya dan Detail Penanganan (tafsiran di luar D-024)

**Konteks.** D-024 menetapkan grafik curah hujan 48 jam sebagai jalur 2 state Bahaya (PermintaanGrafik → MenyiapkanGrafik → SelesaiRender), tetapi tidak mengatur kapan grafik *ditampilkan*. Sebelum desain ulang, grafik selalu tampil. Board Risiko di kanvas desain ulang (D-047) tidak memuat grafik. D-046 hanya menghapus grafik dari Beranda.

**Keputusan.** Grafik di halaman Risiko ditampilkan berdasarkan **state machine**, bukan level risiko:

| State | Grafik |
|---|---|
| `pemantauan` | tidak tampil |
| `bahaya` | tampil (jalur 2 berjalan: grafik tergambar → `GRAFIK_SELESAI`) |
| `penanganan` | tetap tampil |
| `selesai` (normal atau ditutup) | tidak tampil |

**Alasan / konsekuensi.**
- Ini tafsiran, bukan isi D-024. Di UML, grafik diminta saat masuk Bahaya, jadi di Pemantauan grafik belum diminta. Hal ini sekaligus cocok dengan board, yang digambar untuk level Rendah (state Pemantauan).
- `penanganan` ikut dihitung karena state itu hanya dicapai lewat join dari Bahaya (atau deep link notifikasi push, yang mewakili jalur push). Kalau hanya `bahaya`, grafik hilang dua frame setelah tergambar, tepat saat join.
- Syarat "level ≥ Sedang" sengaja **tidak** dipakai. Syarat itu akan menampilkan grafik juga di Final saat peringatan ditutup dengan level masih Sedang/Tinggi, padahal episode Bahaya sudah selesai.
- Grafik tetap tersedia kapan saja di halaman Cuaca.

**Diuji:** e2e state machine: grafik tampil di Detail Penanganan dan hilang setelah peringatan ditutup (Final).

## D-049 · Dialog izin notifikasi dibuka setelah isi wilayah tampil

**Konteks.** Tes e2e "Gunakan lokasi saya" (halaman Cuaca) gagal sesekali. Setelah pengguna memilih wilayah, `PilihWilayah` menjalankan `router.replace()` lalu langsung memanggil `setelahPilihWilayah()`, yang membuka dialog izin begitu status push diketahui. Pengukuran dengan browser yang meniru pengguna baru (izin notifikasi "default", empat lokasi termasuk sel grid yang belum ada di cache) menunjukkan dialog **selalu** terbuka 100–180 ms setelah klik, sedangkan isi cuaca baru tampil setelah 0,9–2,9 detik. Pengguna asli jadi ditanya soal notifikasi sebelum melihat hasil pilihannya.

Urutannya juga tidak deterministik. Dialog Radix bersifat modal dan hanya memberi `aria-hidden` pada elemen yang sudah ada saat dialog dibuka:
- Jika status push lambat (registrasi service worker pertama), isi tampil lebih dulu. Dialog lalu menyembunyikannya dari teknologi bantu, dan tes yang mencari heading lewat role gagal.
- Jika dialog lebih dulu, isi yang datang belakangan tidak disembunyikan. Pembaca layar jadi bisa menjangkau isi di balik dialog modal.

**Keputusan.**
- `NotifikasiProvider` menyimpan tindak lanjut pilihan wilayah sebagai tertunda. Dialog dibuka setelah status push diketahui **dan**, jika diminta (`tungguKonten`), isi halaman untuk wilayah itu sudah tampil. Sinkronisasi wilayah untuk perangkat yang sudah berlangganan tetap langsung.
- `TandaKontenWilayah` diletakkan di dalam `<Suspense>` yang sama dengan isi wilayah di Beranda, Risiko, dan Cuaca. Suspense menampilkan semua anaknya bersamaan, jadi penanda ini ter-mount tepat saat isi tampil, apa pun cabangnya (data ada, data cuaca tidak tersedia, …), lalu melapor ke provider.
- `PilihWilayah` mendapat prop `tungguKonten`. Nilainya `true` di Beranda, Risiko, dan Cuaca. Di Pengaturan tidak ada isi wilayah yang di-stream, jadi dialog tetap langsung.
- Tidak ada jeda waktu tambahan: dialog muncul tepat setelah isi tampil, dan isi terlihat di balik overlay.

**Diuji:** tes "Gunakan lokasi saya" kini menunggu dialog, memastikan prakiraan harian sudah ada di DOM saat dialog muncul, menutup dialog ("Nanti saja"), lalu memeriksa heading.

## D-050 · Desain ulang: halaman Nomor Darurat (`/kontak`)

**Sumber desain.** Board "Nomor Darurat" di kanvas desain ulang: varian *ada 112*, *tanpa 112*, dan *konfirmasi panggilan* (satu komponen dengan dua parameter). Kanvas tidak diubah.

**Keputusan.**
- **Halaman baru `/kontak`** (`?wilayah=` atau cookie wilayah): tombol Kembali, judul "Nomor Darurat", nama wilayah, lalu "Ketuk nomor, lalu konfirmasi untuk menelepon.", kartu merah besar untuk nomor utama, dan bagian "Nomor lainnya". Tanpa wilayah terpilih, halaman tetap berfungsi dengan nomor nasional dan ajakan memilih wilayah di Pengaturan.
- **Konfirmasi dua langkah** sesuai board: ketuk nomor → panel `role="alertdialog"` di tempat ("Batal" besar, "Telepon {nomor}?", tautan `tel:` "Ya, telepon"). Fokus pindah ke "Batal" (pilihan paling aman), Escape membatalkan, dan fokus kembali ke tombol nomor. Hanya satu panel yang terbuka pada satu waktu.
- **Urutan nomor** (`susunNomorDarurat`, diuji unit):
  - 112 sudah diluncurkan di kab/kota (atau wilayah belum dipilih): 112 jadi utama, lalu BPBD kab/kota, BPBD provinsi, 117, 119, 113.
  - 112 belum diluncurkan: BPBD pertama yang nomornya terverifikasi (kab/kota, lalu provinsi) jadi utama, seperti board. Jika tidak ada BPBD bernomor (hampir semua wilayah saat ini, D-043), **112 tetap utama**. Nomor yang tidak ada tidak mungkin dijadikan utama, dan 112 adalah nomor nasional.
- **Penyimpangan dari board, mengikuti D-042/D-043:**
  - Catatan board "Layanan 112 belum tersedia di wilayah ini." diganti "Layanan 112 {kab/kota} belum tercatat diluncurkan." dengan keterangan status dari Portal 112 ("masih berstatus …" / "belum tercatat memiliki layanan 112. Jika tidak tersambung, hubungi nomor darurat lain di bawah."). Aplikasi tidak mengklaim 112 pasti tidak bisa dipakai.
  - Pada varian tanpa 112, board menghapus 112 dari daftar. Di sini **112 tetap ada** di "Nomor lainnya" sebagai nomor nasional.
  - Board hanya menampilkan satu BPBD dengan nomor contoh. Di sini ditampilkan **BPBD kab/kota dan BPBD provinsi** (DKI: provinsi saja). Yang belum punya nomor resmi tampil "Nomor belum tersedia" dan tidak bisa diketuk.
  - **Sumber** (Portal 112 Komdigi + tanggal pengambilan, situs resmi BPBD + tanggal pemeriksaan) dan keterangan (mis. WhatsApp BPBD DIY) tampil di bawah nomornya. Board tidak memuatnya, tetapi konten keselamatan wajib bersumber.
  - Teks konfirmasi board "Panggilan akan langsung tersambung." diganti "Ponsel akan membuka panggilan ke nomor ini.", karena `tel:` di banyak ponsel membuka dialer atau meminta konfirmasi, tidak langsung tersambung.
- **Nama & deskripsi** nomor nasional mengikuti board (Layanan darurat terpadu, Call Center BNPB, Ambulans, Pemadam Kebakaran). Deskripsi 112 = "Nomor darurat nasional", karena di board nama dan deskripsinya sama.
- **Shell:** header situs disembunyikan di layar HP saat di `/kontak` (board tanpa header, ada tombol Kembali). Di desktop header tetap tampil karena menjadi satu-satunya navigasi. Tombol Darurat header kini ke `/kontak` (dengan `aria-current` di halaman itu). Kartu kontak Beranda ke `/kontak?wilayah=…`.
- **Halaman Risiko:** bagian `#kontak-darurat` kini kartu merah "Lihat nomor darurat · Untuk {wilayah}" sesuai board Risiko (mengganti daftar sementara dari D-047). Komponen `KontakDarurat` lama dihapus.
- **Kembali:** `router.back()` jika ada riwayat, selain itu ke Beranda (board menautkan ke Beranda).
- **Offline:** tidak ada perubahan service worker. `/kontak` ikut tersimpan setelah pernah dibuka (network-first, D-027), dan halaman `/offline` sudah memuat 112/117/119.

**Diuji:** unit `nomorDaruratWilayah` (ada 112, tanpa 112 + BPBD bernomor, tanpa 112 tanpa BPBD bernomor, tanpa wilayah). E2E: konfirmasi 112 (fokus Batal, `tel:112`, Escape mengembalikan fokus), BPBD tanpa nomor, 117; varian tanpa 112 (Desa Jangkaran, Kulon Progo: catatan, BPBD Provinsi DIY utama dengan sumber, 112 tetap ada); tanpa wilayah; kartu merah Risiko; tombol Darurat; kartu kontak Beranda Tinggi → `/kontak`; tanpa scroll horizontal.

## D-051 · Kepolisian 110 & Basarnas 115; 112 belum diluncurkan → nomor nasional sebagai pendamping; checklist mengikuti status 112

**Konteks.** Tiga permintaan: (1) tambahkan 110 dan 115 dengan sumbernya; (2) di wilayah yang 112-nya belum tercatat diluncurkan dan tidak punya nomor BPBD resmi, jangan jadikan 112 satu-satunya nomor utama, dan cek dari sumber resmi apa yang terjadi jika 112 ditelepon di sana; (3) butir Checklist Siaga "Catat nomor darurat 112 …" harus menyesuaikan status 112 wilayah pengguna.

**Pemeriksaan sumber (28 September 2026).**
- **`layanan112.kominfo.go.id/tentang`** (tautan di permintaan) sudah tidak dapat di-resolve karena kementerian berganti nama menjadi Komdigi. Halaman yang sama di **`layanan112.komdigi.go.id/tentang`** (dibaca lewat Chromium, karena portal menolak klien non-browser) **tidak memuat** kalimat "110, 113, 115, 119, dan 117 dari Pemerintah Pusat masih bisa digunakan". Yang ada: 112 "mengintegrasikan seluruh nomor darurat seperti 110 (Polisi), 113 (Pemadam Kebakaran), 119 (Ambulans), dan lainnya". Versi lama halaman itu tidak bisa diperiksa karena Wayback Machine sedang menolak permintaan (429/503). Kalimat tersebut karenanya **tidak dipakai sebagai sumber**.
- **Permenkominfo No. 10/2016** (PDF di portal 112) tidak menyebut nomor 110/113/115/117/119 dan **tidak mengatur apa yang terjadi bila 112 ditelepon di daerah yang belum punya Pusat Panggilan Darurat**. Pasal 8–9 mewajibkan operator menyambungkan panggilan ke Pusat Panggilan Darurat di provinsi atau kab/kota sesuai lokasi pemanggil. Pasal 25 (peralihan) membolehkan layanan nomor darurat instansi yang sudah ada tetap berjalan. FAQ portal juga tidak membahasnya. **Kesimpulan:** tidak ada sumber resmi yang menyatakan 112 tersambung (atau tidak) di wilayah seperti itu, jadi aplikasi tidak mengklaim keduanya.
- **Sumber nomor yang dipakai** (`src/data/nomor-nasional.ts`, `SUMBER_NOMOR_NASIONAL`):
  - Buku Saku BNPB, tabel "Kontak Darurat", **hal. 82** (PDF hal. 84): Pusdalops BNPB Call Center 117, Polisi 110, Telepon Darurat 112, Pemadam Kebakaran 113, SAR/Basarnas 115, Ambulans 118 atau 119. Dokumen yang sama dengan D-044. Di sini dipakai untuk nomor nasional, bukan nomor BPBD (D-043 tetap berlaku).
  - Portal 112 Komdigi, "Tentang Call Center 112": 110, 113, 119 (sumber terkini).
  - Basarnas, "Kabasarnas: Darurat SAR, Hubungi 115!" (basarnas.go.id): "…dapat menghubungi Basarnas di nomor 115" (sumber terkini).
  - 117 hanya bersumber Buku Saku: halaman bnpb.go.id yang lain mengembalikan 500/403 untuk klien non-browser, dan hasil render beranda serta halaman kontak tidak memuat "117".

**Keputusan.**
- **Nomor nasional** kini: 112, **115 Basarnas** (Pencarian & pertolongan (SAR)), 117 Call Center BNPB, **110 Kepolisian**, 119 Ambulans, 113 Pemadam Kebakaran. 115 diletakkan paling atas setelah 112 karena relevan untuk evakuasi banjir. Setiap nomor wajib tercantum di minimal satu sumber resmi *.go.id bertanggal (diuji). Halaman Nomor Darurat menampilkan bagian "Sumber nomor darurat nasional". Ambulans ditampilkan 119 saja, walaupun Buku Saku menulis "118 atau 119", karena Portal 112 menyebut 119.
- **112 belum diluncurkan + tanpa BPBD bernomor** (`susunNomorDarurat`): 112 tetap kartu merah utama, tetapi langsung di bawahnya ada bagian **"Hubungi juga nomor darurat nasional"** berisi ubin 115, 117, 110, 119, 113 (grid dua kolom, masing-masing dengan konfirmasi dua langkah). "Nomor lainnya" tinggal BPBD kab/kota & provinsi ("Nomor belum tersedia"). Kasus lain tidak berubah dari D-050: 112 sudah diluncurkan → 112 utama; belum diluncurkan + BPBD bernomor → BPBD utama.
- **Checklist Siaga:** butir seed `ISI_PERSIAPAN_CATAT_NOMOR` ("Catat nomor darurat 112 dan kontak BPBD setempat di ponsel.") disesuaikan saat ditampilkan oleh `lihatPersiapanWilayah` (halaman Risiko dan `GET /api/persiapan?wilayah=`):
  - 112 sudah diluncurkan: teks asli.
  - Belum diluncurkan: "Catat nomor darurat di ponsel: [BPBD bernomor, jika ada], Basarnas 115, Call Center BNPB 117, Kepolisian 110, Ambulans 119, Pemadam Kebakaran 113, dan 112 (layanan 112 {kab/kota} belum tercatat diluncurkan)."
  - `idPersiapan` tidak berubah, jadi progres checklist di localStorage tetap berlaku.
- **Artikel Informasi "Nomor Darurat yang Perlu Disimpan"** diperbarui: ditambah 115 dan 110, diberi sumber Buku Saku hal. 82, dan rujukan "bagian Kontak darurat halaman Risiko" (tidak berlaku sejak D-050) diganti "halaman Nomor Darurat". Tanggal terbit menjadi 28 September 2026.
- `BUKU_SAKU_BNPB` dan `sumberBukuSaku` pindah ke `src/data/buku-saku-bnpb.ts` (dipakai aplikasi dan seed). `npm run cek:sumber` kini juga memeriksa halaman Basarnas masih memuat "115". Portal 112 tidak ikut dicek karena menolak `fetch` biasa.

**Diuji:** unit (urutan & pendamping untuk keempat kasus, teks butir checklist, kelengkapan sumber setiap nomor, Buku Saku → `#page=84`); integration `lihatPersiapanWilayah` (Semarang teks asli, Kulon Progo BPBD DIY lebih dulu, Nias nomor nasional, `idPersiapan` & urutan tetap); e2e (115/110 dan sumbernya di Semarang, pendamping + konfirmasi 115 di Desa Ononamolo I Bot, Kabupaten Nias yang 112-nya "Uji Coba").

## D-052 · Desain ulang: halaman Cuaca

**Sumber desain.** Board "Cuaca" di kanvas desain ulang. Kanvas tidak diubah.

**Keputusan.**
- **Header** sama dengan Risiko: judul "Prakiraan Cuaca", subjudul "Prakiraan 3 hari, harian dan per jam.", baris wilayah dengan tautan "Ubah" ke Pengaturan. Markup header Risiko dipindah ke komponen bersama `KepalaHalaman` (dipakai Risiko dan Cuaca).
- **Pemilih wilayah hanya tampil jika belum ada wilayah terpilih**, sama seperti Beranda (D-046) dan Risiko (D-047). Sebelumnya `/cuaca` selalu menampilkan pemilih. Konsekuensinya, pesan hasil "Gunakan lokasi saya" ("Desa/kelurahan terdekat: … Bukan wilayah Anda? Pilih dari daftar.") hilang setelah halaman dirender ulang dengan wilayah itu. Nama wilayah tetap terlihat di baris wilayah, dan pesan tersebut tetap bertahan di Pengaturan.
- **Cuaca terkini:** ikon kondisi, suhu, label kondisi, tiga ubin (Kelembapan, Angin dalam "km/j", Hujan 15 mnt), lalu "Diperbarui HH:MM WIB · Data cuaca berlaku untuk area ±11 km…" + atribusi Open-Meteo (CC BY 4.0) dalam satu kalimat, seperti board. Kalimat lokasi memakai `teksCatatanLokasi` yang sama dengan Risiko (termasuk keterangan titik pusat kecamatan bila koordinat desa perkiraan), bukan versi board yang lebih pendek. Peringatan data cadangan/hemat kuota (`StatusData`) tampil sebagai kotak di bawah kartu, seperti Beranda dan Risiko. Nama wilayah tidak lagi ada di judul kartu karena sudah ada di header. Komponen `CatatanLokasi` tidak dipakai lagi dan dihapus (fungsi `teksCatatanLokasi` tetap).
- **Prakiraan harian:** satu kartu per hari ("Hari ini", lalu "Rab, 30 Sep"), kategori hujan harian BMKG (`kategoriHujanHarian`) berwarna biru, lalu curah hujan, peluang hujan maksimum, dan rentang suhu. Nama hari menjadi `h3` (di board hanya teks) supaya bisa dinavigasi lewat heading.
- **Prakiraan per jam: grafik Recharts satu hari dengan tab hari** (menyimpang dari board).
  - *Riwayat:* commit pertama halaman ini mengikuti board, yaitu batang CSS curah hujan saja untuk ±58 jam sekaligus. Setelah dipakai, grafik itu dinilai lebih sulit dibaca dibanding grafik Recharts sebelumnya: tidak ada label jam, nilai tidak muncul saat batang disentuh, serta suhu dan peluang hujan per jam hilang.
  - *Keputusan:* grafik Recharts gabungan dikembalikan (batang = hujan mm di sumbu kiri; garis putus-putus = peluang hujan %, garis merah = suhu °C, keduanya di sumbu kanan 0–100), tetapi **satu hari per tampilan**. Hari dipilih lewat tab "Hari ini / Besok / Lusa" (dengan tanggalnya), dan **hari ini menjadi bawaan**. Tab mendukung panah kiri/kanan.
  - Tiap hari menampilkan pukul 00–23 (`seriPerJamPerHari`). Di hari ini, jam yang sudah lewat dibuat pudar dan diberi garis "Sekarang". Label sumbu X muncul tiap 3 jam ("00", "03", … "21"), karena format "03:00" bertumpuk di lebar 390 px. Kalimat keterangan menjelaskan bahwa angka itu pukul WIB. Skala hujan sama untuk ketiga hari (minimal 0–1 mm), supaya batang antarhari bisa dibandingkan.
  - Menyentuh atau mengarahkan kursor ke batang menampilkan tooltip: pukul, hujan, peluang, dan suhu (format angka Indonesia).
  - Warna disesuaikan dengan board: batang biru utama, garis bantu `#E4E9F0`, garis dasar gelap 2 px, teks sumbu `#3E4A5C`, tab bergaya segmented seperti tab Penanganan di Risiko. Legenda ditulis dengan teks, jadi seri tidak dibedakan hanya lewat warna.
  - SVG grafik disembunyikan dari teknologi bantu dan tidak bisa difokus (`accessibilityLayer` dimatikan). Sebagai gantinya ada tabel "Lihat tabel per jam" (`<details>`) berisi 24 baris nilai, untuk pembaca layar, pengguna keyboard, dan siapa pun yang butuh angka pastinya.
  - *Alasan:* **keterbacaan bagi pengguna lebih penting daripada mengikuti board atau ukuran halaman.** Recharts kembali dimuat di `/cuaca` (First Load JS ±150 kB → ±270 kB), dan grafiknya tidak sama dengan board. Hanya warna dan gaya tab yang mengikuti board. Batang CSS, `grafikHujanPerJam`, dan `src/lib/grafik-hujan.ts` dihapus.
- Data tetap dari Open-Meteo (`ringkasanHarian`, `seriPerJamPerHari`); angka contoh di board tidak dipakai.

**Diuji:** unit `seriPerJamPerHari` (mulai hari ini, 24 jam per tanggal, jam lewat bertanda). E2E: tes baru halaman Cuaca (header + Ubah wilayah, cuaca terkini + atribusi, tiga kartu harian, tab Hari ini bawaan dengan 24 batang dan 8 label jam, panah kanan → Besok, tooltip saat diarahkan, tabel 24 baris, tanpa pemilih); "Gunakan lokasi saya" di `/cuaca` kini memastikan pemilih hilang setelah wilayah terpilih; pemeriksaan pesan GPS yang bertahan dan tes pilih bertingkat pindah ke `/pengaturan`.

## D-053 · Desain ulang: halaman Informasi

**Sumber desain.** Board "Informasi" di kanvas desain ulang. Kanvas tidak diubah. Artikel contoh di board tidak dipakai; isi tetap dari tabel `Informasi` (seed + riwayat risiko tinggi otomatis, D-038).

**Keputusan.**
- **Header** memakai `KepalaHalaman` (D-052), tanpa baris wilayah karena board tidak memuatnya. Urutan "artikel milik wilayah terpilih lebih dulu" tetap berlaku.
- **Dua tab** "Informasi umum (n)" dan "Riwayat kejadian (n)", dengan jumlah artikel asli dan tab umum sebagai bawaan. Di board, tab berupa tombol `aria-pressed`. Di sini dipakai `role="tab"` dengan panah kiri/kanan, sama seperti tab di Risiko dan Cuaca. Kedua panel dirender server (panel nonaktif diberi `hidden`), jadi isi tetap ada tanpa JavaScript dan ikut tersimpan untuk offline.
- **Tab aktif ditulis ke `?tab=riwayat`** (lewat `history.replaceState`, tanpa render ulang server). Board tidak mengaturnya. Tanpa ini, tombol Kembali dari artikel riwayat selalu membuka tab umum. Tautan "Kembali ke Informasi" di halaman artikel juga mengarah ke tab asal artikel.
- **Kartu artikel** mengikuti board: judul (seluruh kartu bisa diklik), "Terbit {tanggal} · {wilayah}" untuk artikel umum atau "{tanggal kejadian} · {wilayah}" untuk riwayat, cuplikan dua baris, dan "Sumber: …". Board hanya menampilkan sumber di riwayat. Di sini sumber juga tampil di artikel umum yang punya sumber (mis. Buku Saku BNPB, D-044/D-051), karena konten keselamatan wajib menampilkan sumbernya.
- **Cuplikan** meratakan butir daftar "- …" menjadi kalimat berkoma, seperti contoh board ("Simpan nomor berikut di ponsel Anda: 112: …, 115: …"). Sebelumnya tanda "-" mentah ikut tampil.
- `TautanSumber` kini inline (bukan `inline-flex`), supaya nama sumber yang panjang mengalir setelah "Sumber:" dan ikon tautan luar tetap menempel di akhir. Perubahan ini ikut berlaku di halaman Nomor Darurat.
- **Halaman artikel** (`/informasi/[id]`) tidak punya board. Tipografinya disamakan dengan halaman lain (judul 28 px extrabold, isi dalam kartu putih, tautan Kembali setinggi 44 px), dan isinya tidak berubah.

**Diuji:** e2e Informasi: tab umum bawaan dengan jumlah, panel riwayat tersembunyi, panah kanan → Riwayat dan URL `?tab=riwayat`, tautan sumber BNPB (tab baru, `noopener noreferrer`), artikel riwayat → "Kembali ke Informasi" membuka tab Riwayat, artikel umum → Kembali ke `/informasi`. Tes offline dan tanpa scroll horizontal tetap mencakup `/informasi`.

## D-054 · Desain ulang: halaman Pengaturan

**Sumber desain.** Board "Pengaturan" di kanvas desain ulang. Kanvas tidak diubah.

**Keputusan.**
- **Header** memakai `KepalaHalaman` (tanpa baris wilayah; wilayah diatur di kartu Wilayah). `PageHeader` tidak dipakai lagi di halaman mana pun dan dihapus.
- **Kartu Wilayah** (`PilihWilayah`): kotak biru "Wilayah yang dipantau", label tebal "Cari desa/kelurahan", kolom 48 px bergaris `#9AA6B8` dengan ikon kaca pembesar dan teks 16 px (tidak memicu zoom di iOS), tombol "Gunakan lokasi saya" bergaris biru, pemisah "atau pilih bertingkat", dan empat pilihan bertumpuk satu kolom. `PilihWilayah` juga tampil di Beranda, Risiko, dan Cuaca saat wilayah belum dipilih, jadi gaya baru ini ikut berlaku di sana. Perilakunya tidak berubah: combobox ARIA, pesan hasil GPS yang bertahan (D-052), dan dialog izin (D-049). Pemisah tetap berupa `<legend>` fieldset, jadi keempat pilihan tetap terbaca sebagai satu kelompok.
- **Kartu Notifikasi** (`PengaturanNotifikasi`):
  - Sakelar mengikuti board (58 × 34 px, biru saat aktif, abu-abu `#8A95A6` saat mati). Wujudnya `<button role="switch">` native: namanya dari label "Peringatan banjir", dan teks status jadi deskripsinya (`aria-describedby`). Animasi knob hanya berjalan saat `prefers-reduced-motion` tidak aktif.
  - Teks status aktif/nonaktif mengikuti board ("Aktif. Anda akan menerima peringatan di perangkat ini." / "Nonaktif. Anda tidak akan menerima peringatan."). Status lain yang tidak ada di board (belum aktif, izin ditolak, tidak didukung, belum dikonfigurasi, memuat) tetap dijelaskan dengan kalimat sendiri.
  - Pilihan level berupa kartu radio native (22 px, `accent-color` biru, garis biru + latar `#F1F5FE` saat terpilih) berisi chip Sedang/Tinggi. **Chip diberi ikon level selain teks dan warna** (board hanya teks + warna), sesuai konvensi bahwa level tidak dibedakan dengan warna saja. Nama radio untuk pembaca layar tetap "Sedang dan Tinggi" / "Hanya Tinggi" + keterangan, dan chip disembunyikan dari teknologi bantu supaya tidak dibaca dua kali.
  - "Kirim notifikasi uji" bergaris abu-abu dan catatan anti-spam 6 jam mengikuti board.
  - Komponen shadcn `Switch` dan `RadioGroup` tidak dipakai lagi dan dihapus. Paket `radix-ui` tetap dipakai oleh dialog.
- **Catatan privasi** dalam kartu putih dengan ikon perisai hijau, seperti board.

**Catatan pengujian.** Menjalankan tes alur utama berulang cepat (`--repeat-each=5`) gagal di ulangan ke-4/5, baik di kode sebelum maupun sesudah perubahan ini. Penyebabnya rate limit subscribe/unsubscribe (10/menit per IP), bukan desain ulang ini. Run biasa lolos.

**Diuji:** e2e alur utama kini juga memeriksa judul Pengaturan, deskripsi sakelar saat aktif/nonaktif, nama radio "Sedang dan Tinggi: …" (terpilih), dan radio yang nonaktif saat notifikasi dimatikan. Tes GPS dan pilih bertingkat di `/pengaturan` (D-052) serta pemilih di Beranda/Risiko/Cuaca tanpa wilayah tetap lolos.

## D-055 · Jam pembaruan di Beranda menjadi tombol Perbarui; Beranda memperbarui data lewat state klien

**Konteks.** Di kartu level Beranda, ikon putar di sebelah jam pembaruan ("19:00 WIB") terlihat seperti tombol, tetapi hanya teks. Permintaan: jadikan tombol yang benar-benar memperbarui data dengan fungsi yang sama seperti tombol Perbarui di Risiko, lengkap dengan indikator memuat dan label yang jelas untuk pembaca layar. Periksa juga halaman lain.

**Temuan saat implementasi: `router.refresh()` tidak andal.** Rancangan pertama memanggil API lalu `router.refresh()` untuk merender ulang Beranda. Pengukuran pada build produksi (Next.js 15.5.26, Chromium) menunjukkan:
- `window.next.router.refresh()` yang dipanggil langsung, tanpa kode tombol ini, hanya ter-commit **2 dari 8 kali** di Beranda.
- Gagal di Beranda dan Cuaca yang punya wilayah (halaman dengan `<Suspense>` berisi data wilayah); selalu berhasil di `/` tanpa wilayah, Informasi, Pengaturan, dan Kontak.
- Server mengirim payload RSC lengkap dalam ±10 ms (berisi nilai baru), tetapi React tidak pernah meng-commit-nya. Refresh berikutnya juga tidak ter-commit (antrean aksi router tersumbat). Navigasi lewat tautan tetap berjalan.
- Tidak dipengaruhi service worker, jeda sebelum klik, `key` Suspense, maupun letak komponen klien di dalam/luar Suspense.

Akar masalah di dalam Next/React tidak ditemukan dalam waktu yang wajar. **Konsekuensi yang sudah ada sebelumnya:** `AutoRefresh` (render ulang otomatis tiap 30 menit di Beranda dan Cuaca) memakai `router.refresh()`, jadi pembaruan otomatisnya sering tidak diterapkan. Perbaikannya belum termasuk di sini.

**Keputusan.**
- Pengambilan data tombol Perbarui di Risiko dipindah ke **`ambilDataWilayah()`** (`src/lib/ambil-data-wilayah.ts`): `/api/risiko` + `/api/cuaca`, yang memanggil `lihatKondisiWilayah()` di server. Fungsi ini sekarang juga mengembalikan cuaca terkini. Risiko (`useRiskState.muatUlang`) dan Beranda memakai fungsi yang sama.
- **Beranda meniru cara Risiko:** isi kartu wilayah (`RingkasanBeranda`, komponen klien) berangkat dari data render server, lalu hasil `ambilDataWilayah()` langsung diterapkan ke state, tanpa `router.refresh()`. Komponen diberi `key` dari `idRisiko` + waktu data, supaya render server yang baru (navigasi, atau `AutoRefresh` saat berhasil) menggantikan state lama.
- **Tombol jam pembaruan:** `<button>` dengan ikon putar dan garis tepi (tampak seperti tombol), tinggi 44 px.
  - Nama untuk pembaca layar: "Perbarui data. Terakhir diperbarui pukul HH:MM WIB".
  - Saat memuat: ikon berganti lingkaran pemuat (berputar hanya jika gerak tidak dikurangi), `aria-disabled="true"` (bukan `disabled`, agar fokus keyboard tidak hilang), dan namanya menjadi "Memperbarui data. …". Jam tetap terlihat agar lebar tombol tidak berubah; teks "Memperbarui…" membuat tombol turun ke baris baru di 390 px.
  - Wilayah `role="status"` mengumumkan "Memperbarui data…" lalu "Data diperbarui. Terakhir diperbarui pukul HH:MM WIB.".
  - Gagal: `role="alert"` "Gagal memperbarui: {pesan}. Menampilkan data terakhir." (kalimat sama dengan Risiko), dan data lama tetap tampil.
- **Pemeriksaan halaman lain:** semua ikon dan gaya hover lain yang tampak bisa diklik memang berada di tombol, tautan, label input, atau kartu bertautan. Satu-satunya pola serupa adalah cabang "Data diperbarui pukul …" berikon putar di `StatusData`; cabang itu tidak pernah dirender (semua pemanggil hanya memakainya untuk data lama) dan dihapus, sehingga `StatusData` kini hanya peringatan data lama.

**Diuji:** e2e: tombol bernama benar; respons `/api/risiko` ditahan → nama "Memperbarui data. …", `aria-disabled="true"`, status "Memperbarui data…"; respons diubah (deskripsi dan jam 12:07) → deskripsi baru tampil, nama tombol memuat 12:07, status "Data diperbarui. …"; respons 503 → pesan gagal dan data terakhir tetap tampil. Diulang 5× per proyek tanpa gagal.

## D-056 · Pembaruan otomatis 30 menit lewat `ambilDataWilayah()`, juga saat kembali ke tab/aplikasi

**Konteks.** D-055 mencatat bahwa `AutoRefresh` (render ulang tiap 30 menit di Beranda dan Cuaca) memakai `router.refresh()`, yang di Next.js 15.5 sering tidak di-commit pada halaman berdata wilayah, sehingga pembaruan otomatis sering tidak diterapkan. Selain itu `setInterval` tidak bisa diandalkan: timer browser berhenti atau diperlambat saat HP terkunci, aplikasi dipindah, atau tab di latar belakang.

**Keputusan.**
- `AutoRefresh` dihapus. Hook bersama **`usePembaruanOtomatis(perbarui)`** (`src/hooks/usePembaruanOtomatis.ts`) menjalankan fungsi pembaruan halaman yang mengambil data lewat `ambilDataWilayah()` dan menerapkannya ke state (cara tombol Perbarui, D-055), tanpa `router.refresh()`.
- **Jadwal berdasarkan umur data, bukan timer semata.** Waktu data terakhir diterima di perangkat dicatat dengan `Date.now()` (awal = saat komponen dipasang dengan data render server). `setTimeout` dijadwalkan ke titik "terakhir + 30 menit" dan dijadwalkan ulang setiap pembaruan, termasuk pembaruan manual lewat tombol.
- **Saat kembali ke tab/aplikasi** (`visibilitychange` ke `visible`, `pageshow` termasuk pemulihan bfcache, `focus` jendela): jika data sudah 30 menit atau lebih, langsung diperbarui. Jika belum, tidak ada permintaan.
- Timer yang jatuh tempo saat tab tersembunyi tidak mengambil data; pembaruan ditunda sampai pengguna kembali, agar tab latar belakang tidak memakai kuota.
- Satu pembaruan pada satu waktu. Kegagalan juga dihitung sebagai "terakhir", jadi setiap fokus tidak memicu permintaan baru; percobaan berikutnya 30 menit kemudian.
- **Beranda:** otomatis memakai fungsi yang sama dengan tombol jam pembaruan, jadi indikator memuat, pengumuman status, dan pesan gagal juga muncul saat pembaruan otomatis. Level yang berubah diumumkan ke pembaca layar.
- **Cuaca:** isi halaman dipindah ke komponen klien `IsiCuaca` (state dari render server, diperbarui dari `ambilDataWilayah().cuaca`). `/api/cuaca` kini juga mengirim `perJamPerHari` untuk grafik per jam, dan `KartuCuaca` menerima cuaca terkini + `waktuAmbil` alih-alih model Prisma. Halaman ini tidak punya tombol Perbarui; saat gagal, data terakhir tetap tampil tanpa pesan.
- **Risiko:** `useRiskState` sebelumnya punya `setInterval` + `visibilitychange` sendiri. Logika itu diganti hook yang sama, sehingga tombol Perbarui mengatur ulang jadwal dan `pageshow`/`focus` ikut ditangani.

**Diuji:** e2e per halaman (Beranda dan Cuaca, proyek mobile dan desktop) dengan `page.clock`. Pada menit ke-29, termasuk tab disembunyikan lalu ditampilkan lagi, tidak ada permintaan API. `fastForward` ke menit ke-30 menjalankan timer, dan data API yang diubah tampil (deskripsi risiko / suhu dan jam "Diperbarui"). Tab disembunyikan, lalu `setSystemTime` memajukan jam dinding 31 menit tanpa menjalankan timer (meniru HP terkunci): tidak ada permintaan sampai tab terlihat lagi, lalu data baru tampil. Sepanjang tes tidak ada permintaan RSC non-prefetch, artinya tidak ada `router.refresh()`. Uji mutasi: jika penangan "kembali ke tab" dikosongkan, kedua tes gagal.

## D-057 · Tombol Perbarui mengambil data Open-Meteo baru bila data ≥ 15 menit, dengan umpan balik hasil cek

**Konteks.** Tombol Perbarui di Beranda ditekan pukul 01:44 dan 01:46, tetapi jamnya tetap 01:33 WIB. Penelusuran di database pengembangan: sel grid `-0.9,131.3` (desa 96.71.05.1004) terakhir diambil dari Open-Meteo pukul 01:33:21 (pengamatan 01:30), dan tidak ada pengambilan sesudahnya. Pembaruan tidak gagal. Server memakai cache DB per sel grid selama **30 menit** (`UMUR_CACHE_MS`), jadi kedua tekanan hanya membaca data 01:33. Jam di tombol adalah waktu data diambil dari Open-Meteo (`waktuAmbilData`). Satu-satunya umpan balik saat itu adalah pengumuman untuk pembaca layar. Tombol Perbarui di Risiko bahkan tanpa umpan balik sama sekali.

**Keputusan.**
- **Umur cache khusus tombol: 15 menit** (`UMUR_SEGARKAN_MS` di `src/lib/constants.ts`). Open-Meteo memperbarui cuaca terkini per 15 menit, jadi pengambilan lebih sering tidak menghasilkan data baru. `GET /api/risiko?wilayah=…&segarkan=1` → `lihatKondisiWilayah(id, { segarkan })` → `lihatDataCuaca(titik, { umurMaksMs })`. Kunjungan biasa, pembaruan otomatis (D-056), dan cron tetap memakai 30 menit.
- **Kuota:** batas kunjungan (`BATAS_KUNJUNGAN` 9.000/hari) tetap berlaku. Di atas batas itu tombol mendapat data tersimpan (`hemat-kuota`). Satu sel grid paling banyak 4 panggilan per jam lewat tombol, berapa pun jumlah penggunanya, dan rate limit 60/menit per IP tetap berlaku.
- `ambilDataWilayah(id, { segarkan: true })` meminta `/api/risiko` lebih dulu, baru `/api/cuaca`, agar satu tekanan hanya memicu satu panggilan Open-Meteo. Tanpa `segarkan`, keduanya tetap paralel.
- **Umpan balik yang terlihat** (`teksHasilCek`, `src/lib/hasil-cek.ts`), sama di Beranda (di bawah tombol jam) dan Risiko (di bawah baris status), berupa `role="status"`:
  - Ada data baru: "Data diperbarui pukul 01:48 WIB."
  - Cache < 15 menit: "Sudah dicek 01:46 · data terbaru dari 01:33 WIB. Data cuaca diambil ulang paling cepat 15 menit sekali, berikutnya 01:48 WIB."
  - Data cadangan/hemat kuota: "Sudah dicek 01:46 · data terbaru dari 01:33 WIB." tanpa janji jam berikutnya; alasannya sudah dijelaskan `StatusData`.
  - "Data baru" = `waktuAmbilData` sesudah cek lebih baru daripada sebelumnya. Hasil cek hanya untuk tombol. Pembaruan otomatis cukup mengganti jam, sehingga hook `usePembaruanOtomatis` kini memberi tahu `perbarui` apakah pemanggilnya tombol (`manual`).
- Pengumuman lama "Data diperbarui. Terakhir diperbarui pukul …" (D-055) diganti teks di atas.

**Catatan di luar cakupan:** semua jam ditampilkan dalam WIB (`Asia/Jakarta`), termasuk untuk wilayah WITA/WIT seperti desa uji di atas (Papua Barat Daya).

**Diuji:** unit `teksHasilCek` (data baru, cache, cadangan/hemat kuota). E2E Beranda dan Risiko, mobile dan desktop:
1. Data sel grid dimundurkan 20 menit langsung di DB. Kunjungan biasa masih menampilkan jam lama (cache 30 menit).
2. Tombol ditekan: jam berubah, muncul "Data diperbarui pukul …", dan tepat satu baris `DataCuaca` baru (satu panggilan Open-Meteo).
3. Ditekan lagi: "Sudah dicek … · data terbaru dari {jam baru} … berikutnya …", jumlah baris tidak bertambah.

Tes D-055 disesuaikan dengan teks baru.

## D-058 · Build dan e2e otomatis memakai `.next-prod`

**Konteks.** D-040 memindahkan build ke folder lain hanya jika `NEXT_DIST_DIR` diatur manual. Saat `npm run dev` berjalan dan variabel itu lupa diatur, `next build` menimpa `.next` milik server pengembangan. Server pengembangan juga menulis balik ke build produksi, sehingga e2e gagal dengan galat modul webpack (`Cannot read properties of undefined (reading 'call')`) (terjadi 30 September 2026).

**Keputusan.** `next.config.ts` kini berupa fungsi fase. `next dev` (`PHASE_DEVELOPMENT_SERVER`) memakai `.next`; `next build` dan `next start` memakai `.next-prod`. Karena server e2e dijalankan dengan `npm run start`, `npm run build; npm run test:e2e` otomatis memakai `.next-prod` tanpa variabel lingkungan. Aturannya:
- Di Vercel (`VERCEL` diatur), folder tetap `.next`, sesuai perilaku platform.
- `NEXT_DIST_DIR` tetap mengalahkan keduanya.
- `.next-prod/types` ditambahkan ke `tsconfig.json` agar Next.js tidak menulis ulang berkas itu (lihat D-040).
- Folder `.next-*` sudah diabaikan git dan ESLint.

**Diuji:** `npm run build` saat `npm run dev` berjalan di port 3000. `.next` milik server pengembangan tidak berubah, dan seluruh e2e lolos dari `.next-prod`.

## D-059 · Riwayat kejadian 2024–2026 dari rilis BNPB; sumber tanggal kejadian dan "Data per"

**Konteks.** Riwayat kejadian seed berhenti di 2021. Data kejadian BNPB tidak bisa diunduh secara terprogram:
- gis.bnpb.go.id/databencana menjawab 403.
- Berkas data.bnpb.go.id terhalang pemeriksaan bot Cloudflare dan hanya berisi rekap tahunan.
- DIBI menolak kueri data tanpa login.
- Lapisan ArcGIS `Kejadian_Bencana_Mingguan` hanya memuat satu minggu (Juni–Juli 2026) dan terbuka untuk diubah publik.

Karena itu dipilih kurasi manual dari rilis www.bnpb.go.id. Daftar berita ditelusuri halaman demi halaman sampai Januari 2024, lalu setiap usulan disetujui pemilik proyek sebelum dimasukkan. Sebagian rilis tidak menyebut tanggal kejadian.

**Keputusan.**
- **14 entri baru** dengan wilayah beragam: Sumatra Barat (Mei 2024), Kab. Luwu, Kota Ternate, Kab. Sukabumi, Kalimantan Barat, Bali, Kab. Nagekeo, Kab. Nduga, Aceh, Sumatra Utara, Sumatra Barat (2025), Kab. Kepulauan Sitaro, Jawa Tengah (Pantura), dan Kab. Solok. Isi hanya memuat hal yang disebut rilis yang dirujuk (D-039). Angka disebut beserta tanggal datanya karena berupa data sementara.
- **Bencana banjir dan longsor Sumatra November 2025 dipecah per provinsi** (Aceh, Sumatra Utara, Sumatra Barat). Ketiganya memakai rilis 14 Desember 2025 (total 1.016 korban meninggal) dengan angka per provinsi. Uji seed kini mensyaratkan pasangan tautan + wilayah yang unik, bukan tautan saja.
- **Tanggal** (kolom baru `Informasi`, migrasi `20260929194807_riwayat_sumber_tanggal`):
  - Tanggal kejadian tidak ada di rilis utama tetapi ada di rilis BNPB lain: `tanggal` = tanggal kejadian, dan rilis kedua disimpan di `sumberTanggalNama/Url`. Keduanya ditampilkan: "Sumber: …" dan "Tanggal kejadian: …". Berlaku untuk Sumatra Barat 2024 (rilis Tanah Datar 12 Mei 2024: "Sabtu (11/5) pukul 21.00 WIB") dan Sumatra Utara 2025 (rilis 26 November 2025: "Senin (24/11) dan Selasa (25/11)").
  - Tidak ada rilis BNPB yang menyebut tanggal mulai untuk cakupan entri itu: `tanggal` = tanggal data, `tanggalDataPer = true`, ditampilkan "Data per 19 Jan 2026". Berlaku untuk Kalimantan Barat (rilis Sambas 17 Januari 2025 hanya satu kabupaten), Aceh dan Sumatra Barat 2025 (rilis Padang/Agam hanya satu kota/kabupaten), dan Pantura Jawa Tengah (rilis 15 Januari 2026 membahas Muria Raya, kejadian lain).
  - Solok: dua rilis menyebut jam berbeda (19.30 dan 19.45 WIB), jadi hanya tanggalnya yang dicantumkan.
- `npm run cek:sumber` juga memeriksa tautan sumber tanggal.

**Diuji:** `npm run cek:sumber` (31 tautan, semua HTTP 200, 30 September 2026). Unit seed memeriksa: host `.go.id` untuk kedua sumber; nama dan tautan sumber tanggal selalu berpasangan; sumber tanggal dan "Data per" tidak dipakai bersamaan. E2E Informasi memeriksa kartu Pantura ("Data per 19 Jan 2026") serta kartu Sumatra Utara (24 Nov 2025, sumber utama, dan tautan "Tanggal kejadian").

## D-060 · Jam dan tanggal mengikuti zona waktu wilayah (WIB/WITA/WIT)

**Konteks.** Semua jam ditampilkan dalam WIB (`Asia/Jakarta`), termasuk untuk wilayah WITA dan WIT. Contohnya, pengguna di Papua Barat Daya melihat "01:33 WIB" untuk data yang diambil pukul 03:33 waktu setempat. Grafik per jam di Cuaca juga dikelompokkan per hari WIB, dan riwayat otomatis per kab/kota memakai hari kalender WIB.

**Keputusan.**
- **Zona per provinsi** (`src/lib/zona-waktu.ts`, `zonaWilayah(kode)`), dari dua digit pertama kode Kemendagri:
  - WITA: 51–53, 63–65, 71–76.
  - WIT: 81, 82, 91–96.
  - Selain itu WIB, termasuk tanpa wilayah.
- `formatJam`, `formatTanggal`, dan `formatTanggalPanjang` kini **wajib** menerima zona, sehingga typecheck menangkap setiap tempat yang lupa. `formatJamZona` menghasilkan "14:05 WITA". Tidak ada lagi teks "WIB" yang ditulis mati di komponen.
- **Yang mengikuti zona wilayah:**
  - Jam pembaruan di Beranda (tombol, termasuk nama aksesibelnya) dan hasil cek D-057.
  - Kartu level Risiko dan grafik hujan 48 jam.
  - Kartu cuaca terkini, peringatan data lama (`StatusData`), dan grafik/tabel per jam di Cuaca.
  - Tanggal di Informasi (dibaca di zona wilayah entri).
  - Riwayat otomatis per kab/kota: jam desa, tanggal, dan **batas hari kalender** sekarang lokal (menggantikan "hari kalender WIB" di D-038).
  - Notifikasi push.
- **Notifikasi:** sebelumnya tidak memuat jam. Isinya kini diawali jam penilaian risiko, mis. "Pukul 14:05 WITA: Risiko SEDANG karena …".
- **Data Open-Meteo tetap diminta dalam `Asia/Jakarta`**, karena cache dipakai bersama per sel grid dan satu sel bisa berada di perbatasan zona. `seri-cuaca` mengonversi waktu per jam ke zona wilayah; "sekarang", "hari ini", dan pengelompokan per hari memakai tanggal lokal. `/api/cuaca` mengirim seri dalam zona wilayah beserta `zonaWaktu`.
  - Ringkasan harian untuk WITA/WIT dihitung dari data per jam hari lokal (jumlah hujan, peluang maksimum), karena `daily` Open-Meteo mengikuti hari WIB. WIB tetap memakai `daily`.
  - Hanya hari lokal yang lengkap 24 jam yang ditampilkan, maksimal 3 hari.
  - `forecast_days` dinaikkan dari 3 ke 4 agar hari ke-3 di WIT tetap lengkap setelah pukul 22.00 WIB. Tetap 1,0 panggilan API (D-035): kurang dari 2 minggu, 10 variabel.
- **Tidak berubah:** perhitungan parameter risiko. `hujan_3hari` tetap memakai `daily` per hari WIB; jendela 24 jam tidak bergantung zona. Tanggal tanpa jam (tanggal pemeriksaan kontak, peluncuran 112) juga tidak berubah.

**Diuji:**
- Unit:
  - Pemetaan provinsi untuk ketiga zona pada kode tingkat apa pun.
  - Format jam dan tanggal; malam WIB bisa berarti tanggal berikutnya di WIT.
  - `seri-cuaca` WIT/WITA: pergeseran jam, "sekarang", ringkasan dari data per jam, dan hari tidak lengkap dibuang.
  - Hasil cek D-057 dalam WIT; batas hari dan teks riwayat otomatis per zona; notifikasi WIB/WITA/WIT.
- E2E, satu wilayah per zona (Kelurahan Bulu Lor, Semarang; Kelurahan Serangan, Denpasar; Kelurahan Jambula, Ternate) di mobile dan desktop:
  - Jam tombol Beranda, kartu Cuaca, dan kartu Risiko sama dengan waktu data di DB yang diformat di zona IANA wilayah itu.
  - Keterangan grafik "pukul (WITA)"; jumlah baris "sudah lewat" di tabel per jam = jam pengamatan lokal + 1.

## D-061 · Tanggal dan jam riwayat kejadian mengikuti zona lokasi kejadian

**Konteks.** Diminta: tanggal dan jam riwayat kejadian ditampilkan dalam zona waktu lokasi kejadian, bukan zona wilayah pengguna (mis. Sitaro tetap "02.30 WITA" walau pengguna memilih wilayah WIB). Pemeriksaan kode menunjukkan perilaku ini **sudah benar sejak D-060**:
- Tanggal dibaca di zona `idWilayah` milik entri. Wilayah pengguna hanya dipakai untuk mengurutkan daftar.
- Jam di isi riwayat tertulis tetap: dari rilis BNPB ("02.30 WITA") atau dibuat saat deteksi dalam zona kab/kota (riwayat otomatis).
- Tanggal seed tanpa jam disimpan 00:00 UTC, sehingga tetap tanggal yang sama di ketiga zona.

Yang belum ada adalah tes untuk kejadian dekat tengah malam.

**Keputusan.** Aturan ini ditegaskan: teks tanggal dipindah ke fungsi murni `teksTanggalInformasi` (`src/lib/tanggal-informasi.ts`), yang hanya menerima wilayah entri, tidak pernah wilayah pengguna. Riwayat otomatis D-038 sudah memakai hari kalender zona kab/kota (D-060). Entri tanpa wilayah memakai WIB.

**Diuji:**
- Unit:
  - Ternate 15:30 UTC → "26 Sep 2026" (00:30 WIT; WIB masih 25 Sep).
  - Denpasar 16:30 UTC → 26 Sep (00:30 WITA).
  - Semarang 16:59 UTC → 25 Sep (23:59 WIB).
  - Sitaro "Senin, 5 Januari 2026" di zona mana pun.
- Integration: deteksi TINGGI di Kelurahan Jambula, Kota Ternate, pukul 23:50 WIT dan 00:10 WIT (keduanya 2 Februari menurut WIB) menghasilkan dua entri: "Minggu, 2 Februari 2020 … (23:50 WIT)" dan "Senin, 3 Februari 2020 … (00:10 WIT)", tanpa "WIB".
- E2E, dengan entri uji yang dibuat lalu dihapus:
  - Pengguna memilih wilayah WIB (Semarang): kejadian Ternate 00:30 WIT bertanggal 26 Sep 2026; Sitaro 5 Jan 2026 dengan isi "pukul 02.30 WITA".
  - Pengguna memilih wilayah WIT (Ternate): kejadian Semarang 23:30 WIB tetap 25 Sep 2026.

## D-062 · Keterangan tombol Perbarui: versi singkat saat jam cek = jam data; semua jam berzona

**Konteks.** Menekan Perbarui tepat setelah data diambil menghasilkan kalimat berulang seperti "Sudah dicek 06:11 · data terbaru dari 06:11 WIT. …". Jam cek juga belum mencantumkan zona.

**Keputusan** (`teksHasilCek`, melanjutkan D-057):
- Jam cek dan jam data sama (menit yang sama di zona wilayah): **"Data sudah terbaru (06:11 WIT). Bisa diperbarui lagi pukul 06:26 WIT."** Untuk data cadangan/hemat kuota cukup "Data sudah terbaru (06:11 WIT).", karena jam berikutnya tidak dijamin (lihat `StatusData`).
- Selain itu tetap versi lengkap, kini dengan zona pada jam cek: "Sudah dicek 06:20 WIT · data terbaru dari 06:11 WIT. Data cuaca diambil ulang paling cepat 15 menit sekali, berikutnya 06:26 WIT."
- "Data diperbarui pukul 06:26 WIT." tidak berubah.
- Setiap jam di semua versi diikuti singkatan zona wilayah (D-060).

**Diuji:**
- Unit:
  - Versi singkat di WIB/WITA/WIT.
  - Versi singkat untuk data cadangan tanpa jam berikutnya.
  - Beda satu menit → versi lengkap.
  - Untuk setiap versi dan zona, semua pola `HH:MM` diikuti singkatan zona.
- E2E D-057 (Beranda dan Risiko): jam browser dikunci dengan `page.clock.setFixedTime`.
  - Sama dengan jam data → teks singkat persis.
  - Dua menit kemudian → teks lengkap persis.
  - Tidak ada panggilan Open-Meteo tambahan.
