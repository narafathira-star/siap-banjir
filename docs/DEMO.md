# Demo: Peringatan Risiko Banjir TINGGI (Simulasi)

Panduan demo di depan kelas: memunculkan notifikasi push **[SIMULASI]** risiko banjir TINGGI untuk Desa Sariharjo (Ngaglik, Kabupaten Sleman) di Firefox, lalu menunjukkan halaman Detail Penanganan.

Semua perintah dijalankan di **PowerShell**, di folder `D:\siap-banjir`.

| | |
|---|---|
| Desa | Sariharjo, Ngaglik, Kabupaten Sleman, DI Yogyakarta |
| Kode wilayah | `34.04.12.2001` |
| Halaman risiko | http://localhost:3000/risiko?wilayah=34.04.12.2001 |
| Durasi | ± 5 menit |

## Yang terjadi saat simulasi

Ambang risiko **tidak diubah**. Simulasi hanya menyimpan nilai hujan 24 jam 60 mm untuk desa itu. Nilai ini melewati batas TINGGI global (≥ 50 mm), lalu risiko dihitung dengan ambang asli seperti biasa. Hasilnya:

- judul notifikasi push diawali **[SIMULASI]**, dan isinya menyebut "Ini simulasi uji, bukan kondisi cuaca sebenarnya.";
- halaman risiko juga berlabel [SIMULASI];
- **tidak ditulis ke riwayat** di halaman Informasi;
- tidak menahan peringatan asli (anti-spam dihitung terpisah).

Rinciannya ada di [DECISIONS.md, D-041](DECISIONS.md#d-041--simulasi-memakai-nilai-hujan-bukan-menurunkan-ambang-menyimpang-dari-uml).

## A. Persiapan (sebelum kelas)

1. **Jalankan aplikasi** di terminal terpisah dan biarkan terbuka selama demo:

   ```powershell
   npm run dev
   ```

2. **Langganan notifikasi di Firefox** (cukup sekali, langganan tersimpan di database):
   - Buka http://localhost:3000, pilih Desa **Sariharjo** (ketik "sariharjo" di pencarian).
   - Klik **Aktifkan Peringatan**, lalu izinkan notifikasi saat Firefox bertanya.
   - Level minimum biarkan **Sedang** (atau Tinggi).

3. **Uji notifikasi:** buka http://localhost:3000/pengaturan, lalu klik **Kirim notifikasi uji**. Kalau notifikasi uji muncul, push sudah siap.

4. **Matikan Focus Assist / Do Not Disturb di Windows** agar pop-up tidak disembunyikan. Firefox harus tetap terbuka selama demo.

5. **Pastikan tidak ada simulasi yang tertinggal:**

   ```powershell
   npm run simulasi -- status
   ```

   Harus tampil `Tidak ada simulasi aktif.` Kalau masih ada, matikan dulu (lihat bagian C).

## B. Menyalakan simulasi (saat demo)

**Langkah 1: nyalakan simulasi risiko TINGGI.**

```powershell
npm run simulasi -- aktifkan 34.04.12.2001 TINGGI
```

Keluaran yang diharapkan:

```
✔ Simulasi aktif untuk Sariharjo, Ngaglik, Kabupaten Sleman, Daerah Istimewa Yogyakarta: hujan 24 jam 60 mm → level TINGGI menurut ambang asli.
⚠ 1 perangkat berlangganan di wilayah ini dan akan menerima notifikasi push berlabel [SIMULASI].
```

Sampai di sini belum ada notifikasi. Simulasi baru dipakai ketika risiko desa dihitung ulang, yaitu pada langkah 2.

**Langkah 2: picu perhitungan risiko.** Pilih salah satu cara:

- **Cara 1, lewat browser (paling mudah ditunjukkan ke kelas):** buka http://localhost:3000/risiko?wilayah=34.04.12.2001 di Firefox. Halaman menampilkan risiko TINGGI [SIMULASI], dan beberapa detik kemudian notifikasi push muncul.

- **Cara 2, lewat cron (seperti pengecekan otomatis tiap 30 menit):**

  ```powershell
  $secret = ((Select-String -Path .env -Pattern '^CRON_SECRET=').Line -replace '^CRON_SECRET=', '').Trim('"')
  Invoke-RestMethod http://localhost:3000/api/cron/update-weather -Headers @{ Authorization = "Bearer $secret" } | ConvertTo-Json -Depth 5
  ```

  Periksa bahwa hasilnya berisi `"notifikasiTerkirim": 1` dan `"riwayat": 0`.

**Langkah 3: tunjukkan hasilnya.**

- Notifikasi di Firefox: **"[SIMULASI] ⚠️ Risiko banjir TINGGI di Desa Sariharjo, Kabupaten Sleman"**.
- Klik notifikasinya: Firefox membuka halaman risiko langsung di bagian **Detail Penanganan** (Checklist Siaga, Detail Mitigasi, kontak darurat).
- Opsional: buka http://localhost:3000/informasi dan tunjukkan bahwa riwayat risiko tinggi **tidak bertambah**, karena simulasi tidak dicatat sebagai kejadian.

## C. Mematikan simulasi (setelah demo)

```powershell
npm run simulasi -- pulihkan 34.04.12.2001
npm run simulasi -- status
```

Keluaran yang diharapkan: `✔ 34.04.12.2001: simulasi dihapus, …` lalu `Tidak ada simulasi aktif.`

`pulihkan` menghapus nilai hujan simulasi dan risiko hasil simulasi beserta catatan notifikasinya. Data cuaca asli dan riwayat tidak disentuh. Kunjungan berikutnya ke halaman risiko kembali memakai risiko asli.

Untuk mematikan **semua** simulasi sekaligus:

```powershell
npm run simulasi -- pulihkan --semua
```

## Mengulang demo

Jalankan **C lalu B** lagi. `pulihkan` wajib dijalankan dulu. Tanpa itu, risiko simulasi untuk data cuaca yang sama sudah tercatat dan notifikasinya sudah terkirim, sehingga push kedua tidak dikirim (`notifikasiTerkirim: 0`).

## Jika ada masalah

| Gejala | Penyebab & solusi |
|---|---|
| `notifikasiTerkirim: 0` | Simulasi sebelumnya belum dipulihkan. Jalankan bagian C, lalu B. |
| Notifikasi uji juga tidak muncul | Izin notifikasi Firefox untuk `localhost` ditolak, atau Focus Assist aktif. Periksa ikon gembok di address bar dan pengaturan notifikasi Windows. |
| Halaman menampilkan risiko asli, bukan [SIMULASI] | Langkah 1 belum dijalankan atau gagal. Cek `npm run simulasi -- status`. |
| `Menolak: DATABASE_URL mengarah ke …` | Script hanya berjalan di database lokal. Periksa `DATABASE_URL` di `.env`. |
| `Wilayah "…" tidak ditemukan` | Kode salah ketik. Cari kodenya: `npm run simulasi -- cari sariharjo`. |
| Cron gagal `401` | `CRON_SECRET` di `.env` berbeda dengan yang dipakai server. Restart `npm run dev` setelah mengubah `.env`. |

## Catatan

- Setiap demo bisa memakai 1 request kuota Open-Meteo, yaitu jika data cuaca sel Sariharjo lebih tua dari 30 menit. Ini normal dan jauh di bawah batas harian.
- Simulasi juga bisa untuk wilayah lain dan level SEDANG, misalnya `npm run simulasi -- aktifkan 34.04 SEDANG` untuk semua desa di Kabupaten Sleman. Lihat bagian [Simulasi risiko tinggi](../README.md#simulasi-risiko-tinggi) di README.
- Push dikirim ke **semua** perangkat yang berlangganan wilayah itu, jadi jangan jalankan simulasi terhadap database produksi.
