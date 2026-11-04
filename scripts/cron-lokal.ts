/**
 * Penjadwal lokal untuk pengembangan: panggil endpoint cron sekarang lalu setiap 30 menit.
 * Jalankan bersama `npm run dev` / `npm start`:  npm run cron:lokal
 */
const INTERVAL_MS = 30 * 60 * 1000;
const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/cron/update-weather`;
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("CRON_SECRET belum diatur di .env");
  process.exit(1);
}

async function panggil() {
  const waktu = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" });
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    const body: unknown = await res.json();
    const ringkasan = body && typeof body === "object" && "ringkasan" in body ? body.ringkasan : body;
    console.log(`[${waktu}] HTTP ${res.status}`, ringkasan);
  } catch (err) {
    console.error(`[${waktu}] Gagal memanggil ${url}:`, err instanceof Error ? err.message : err);
  }
}

console.log(`Penjadwal lokal aktif: ${url} setiap 30 menit (Ctrl+C untuk berhenti).`);
void panggil();
setInterval(() => void panggil(), INTERVAL_MS);
