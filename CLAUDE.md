# Siap Banjir

Aplikasi web pemantauan risiko banjir dan peringatan dini untuk seluruh Indonesia, berbasis data cuaca Open-Meteo. Pengguna memilih desa/kelurahan (kode Kemendagri, mis. `34.04.12.2001`), lalu melihat cuaca, **level risiko (Rendah / Sedang / Tinggi)**, persiapan dini, rekomendasi, dan kontak darurat, serta bisa menerima notifikasi push. Tanpa login: identitas = perangkat (Web Push subscription).

Implementasi **mengikuti rancangan UML** (use case, class, sequence, activity, state machine) dari prompt awal. Setiap penyimpangan dicatat di `docs/DECISIONS.md`.

## Stack

Next.js 15 (App Router, server components) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/ui · Prisma 6 + PostgreSQL 17 (terpasang langsung di Windows, bukan Docker) · Web Push (VAPID) · Vitest + Playwright · deploy Vercel.

## Dokumen penting

| Berkas | Isi |
|---|---|
| `README.md` | Fitur, arsitektur folder, setup lokal Windows, env, cron, testing, deploy |
| `docs/DECISIONS.md` | Catatan keputusan D-001 … D-0xx (konteks → keputusan → alasan). **Baca sebelum mengubah perilaku.** Keputusan baru = entri `D-0xx` baru di akhir berkas |
| `docs/prompt-claude-code-siapbanjir.md` | Prompt awal proyek: ringkasan UML dan kebutuhan per fase |
| `docs/DEMO.md` | Panduan demo simulasi risiko TINGGI (`npm run simulasi`) |

Keputusan yang paling sering relevan: D-024 (state machine risiko sebagai reducer, `src/lib/mesin-risiko.ts`), D-033 (kode wilayah Kemendagri), D-041 (simulasi), D-042/D-043/D-051 (layanan 112, nomor BPBD & nomor nasional hanya dari sumber resmi), D-044 (Detail Mitigasi dari Buku Saku BNPB dengan halaman sumber), D-046 dan seterusnya (desain ulang).

## Desain ulang (branch `redesign`)

Sumber desain: kanvas **"Siap Banjir — Desain Ulang"** — https://claude.ai/artifact/At4ycApW4YRThqyVtNV9LC

- Baca board lewat tool Artifact (`action: "read"`, `path: "project/<Board>.dc.html"`); indeks board ada di `project/canvas.json`. Kanvas hanya dibaca, **jangan diubah**.
- Board (lebar 390 px, mobile-first): `Main` / `Beranda-Sedang` / `Beranda-Tinggi` (Beranda per level), `Risiko`, `Kontak` / `Kontak-Tanpa112` / `Kontak-Konfirmasi` (halaman Nomor Darurat), `Cuaca`, `Informasi`, `Pengaturan`.
- Token warna kanvas sudah dipasang di `src/app/globals.css` (D-046). Gaya per level ada di `src/components/risiko/gaya-level.ts`.
- **Satu halaman satu commit**, tiap commit disertai entri DECISIONS dan penyesuaian e2e.
- Board berisi teks contoh. Data asli (deskripsi mesin risiko, rekomendasi BNPB, kontak resmi) tetap dipakai; jangan menyalin angka/teks contoh dari board.

Status: Beranda + shell global (D-046), Risiko (D-047, D-048), Nomor Darurat `/kontak` (D-050, D-051), Cuaca (D-052), Informasi (D-053), dan Pengaturan (D-054) selesai. Semua board sudah diimplementasikan.

## Perintah

```powershell
npm run dev            # server pengembangan
npm run typecheck; npm run lint; npm test
npm run test:integration   # memakai database pengembangan (D-021)
npm run build; npm run test:e2e   # e2e memakai build produksi di port 3100
```

## Konvensi

- Bahasa Indonesia untuk kode domain, komentar, UI, commit, dan dokumen (`lihatKondisiWilayah`, `PanelRisiko`, `GAYA_LEVEL`).
- Level risiko tidak boleh dibedakan dengan warna saja: selalu ada teks dan ikon.
- Target sentuh ≥ 44 px, fokus keyboard outline biru 3 px, animasi mati saat `prefers-reduced-motion`.
- Konten keselamatan (nomor darurat, rekomendasi) hanya dari sumber resmi, dengan sumbernya ditampilkan.
- Jam dan tanggal selalu dalam zona wilayah terpilih (WIB/WITA/WIT, `zonaWilayah()`, D-060); jangan menulis "WIB" secara tetap.
