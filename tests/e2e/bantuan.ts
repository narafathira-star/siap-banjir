import type { Page, TestInfo } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/** Desa/kelurahan yang disimulasikan berisiko TINGGI oleh global-setup (Kelurahan Bandengan, Kota Pekalongan). */
export const WILAYAH_SIMULASI = "33.75.03.1009";

/** Kelurahan Bulu Lor, Kec. Semarang Utara, Kota Semarang. */
export const DESA_UJI = "33.74.02.1002";

/** Desa Jangkaran, Kulon Progo: kab/kota tidak tercatat di Portal 112; BPBD Provinsi DIY bernomor resmi. */
export const DESA_TANPA_112 = "34.01.01.2001";

/** Desa Ononamolo I Bot, Kabupaten Nias: layanan 112 berstatus "Uji Coba"; tidak ada nomor BPBD resmi. */
export const DESA_TANPA_112_TANPA_BPBD = "12.04.05.2001";

/** Token perangkat & endpoint push tetap per project, agar bisa dibersihkan di teardown. */
export function identitasUji(testInfo: TestInfo) {
  const akhiran = testInfo.project.name === "mobile" ? "e2e1" : "e2e2";
  return {
    deviceToken: `00000000-0000-4000-8000-00000000${akhiran}`,
    endpoint: `https://fcm.googleapis.com/fcm/send/uji-e2e-siapbanjir-${akhiran}`,
  };
}

export const DEVICE_TOKEN_UJI = ["00000000-0000-4000-8000-00000000e2e1", "00000000-0000-4000-8000-00000000e2e2"];

/**
 * Chromium headless tidak bisa berlangganan ke push service sungguhan dan selalu melaporkan
 * izin notifikasi "denied". Notification.permission/requestPermission dan PushManager di-stub
 * dengan subscription sintetis (endpoint FCM + kunci valid secara format);
 * semua request ke server Siap Banjir tetap asli.
 */
export async function stubPush(page: Page, testInfo: TestInfo) {
  const { deviceToken, endpoint } = identitasUji(testInfo);
  await page.addInitScript(
    ({ deviceToken, endpoint }) => {
      localStorage.setItem("siapbanjir_device", deviceToken);
      const palsu = {
        endpoint,
        expirationTime: null,
        options: { userVisibleOnly: true, applicationServerKey: null },
        getKey: () => null,
        unsubscribe: async () => {
          localStorage.removeItem("e2e_langganan");
          return true;
        },
        toJSON: () => ({
          endpoint,
          expirationTime: null,
          keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u", auth: "tBHItJI5svbpez7KI4CCXg" },
        }),
      };
      // Chromium headless selalu melaporkan Notification.permission = "denied".
      // Simulasikan pengguna baru: "default" sampai requestPermission() dipanggil.
      Object.defineProperty(Notification, "permission", {
        configurable: true,
        get: () => (localStorage.getItem("e2e_izin") as NotificationPermission | null) ?? "default",
      });
      Notification.requestPermission = async () => {
        localStorage.setItem("e2e_izin", "granted");
        return "granted";
      };
      PushManager.prototype.subscribe = async function () {
        localStorage.setItem("e2e_langganan", "1");
        return palsu as unknown as PushSubscription;
      };
      PushManager.prototype.getSubscription = async function () {
        return (localStorage.getItem("e2e_langganan") === "1" ? palsu : null) as unknown as PushSubscription | null;
      };
    },
    { deviceToken, endpoint },
  );
}

/** "01:33" (WIB), sama dengan `formatJam` aplikasi. */
export function jamWib(waktu: Date) {
  return jamDiZona(waktu, "Asia/Jakarta");
}

/** "01:33" di zona IANA `zona` (mis. "Asia/Jayapura"). */
export function jamDiZona(waktu: Date, zona: string) {
  const bagian = new Intl.DateTimeFormat("id-ID", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(waktu);
  const ambil = (tipe: string) => bagian.find((b) => b.type === tipe)?.value ?? "";
  return `${ambil("hour")}:${ambil("minute")}`;
}

/**
 * Mundurkan waktu ambil data cuaca terbaru di sel grid desa ini (tanpa memanggil Open-Meteo),
 * meniru data yang diambil `menit` menit lalu. `jumlahData()` menghitung baris DataCuaca sel itu
 * (= jumlah panggilan Open-Meteo, D-035).
 */
export async function tuakanDataCuaca(idWilayah: string, menit: number) {
  const db = new PrismaClient();
  try {
    const { kunciGrid } = await db.wilayah.findUniqueOrThrow({ where: { idWilayah }, select: { kunciGrid: true } });
    if (!kunciGrid) throw new Error(`${idWilayah} tanpa sel grid`);
    const terakhir = await db.dataCuaca.findFirstOrThrow({ where: { kunciGrid }, orderBy: { waktuAmbil: "desc" } });
    const waktu = new Date(Date.now() - menit * 60_000);
    await db.dataCuaca.update({ where: { idCuaca: terakhir.idCuaca }, data: { waktuAmbil: waktu } });
    return { waktu, jumlahData: () => jumlahDataCuaca(kunciGrid) };
  } finally {
    await db.$disconnect();
  }
}

async function jumlahDataCuaca(kunciGrid: string) {
  const db = new PrismaClient();
  try {
    return await db.dataCuaca.count({ where: { kunciGrid } });
  } finally {
    await db.$disconnect();
  }
}

/** Data cuaca terbaru sel grid desa ini: waktu ambil (jam di tombol/kartu) dan waktu pengamatan (jam "sekarang"). */
export async function dataCuacaTerbaru(idWilayah: string) {
  const db = new PrismaClient();
  try {
    const { kunciGrid } = await db.wilayah.findUniqueOrThrow({ where: { idWilayah }, select: { kunciGrid: true } });
    if (!kunciGrid) throw new Error(`${idWilayah} tanpa sel grid`);
    return await db.dataCuaca.findFirstOrThrow({
      where: { kunciGrid },
      orderBy: { waktuAmbil: "desc" },
      select: { waktuAmbil: true, waktuPengamatan: true },
    });
  } finally {
    await db.$disconnect();
  }
}

/** Tambah riwayat kejadian uji langsung ke DB; kembalikan fungsi untuk menghapusnya. */
export async function buatRiwayatUji(data: { idWilayah: string; judul: string; isi: string; tanggal: Date }) {
  const db = new PrismaClient();
  try {
    const { idInformasi } = await db.informasi.create({ data: { ...data, kategori: "RIWAYAT_KEJADIAN" } });
    return async () => {
      const hapus = new PrismaClient();
      try {
        await hapus.informasi.deleteMany({ where: { idInformasi } });
      } finally {
        await hapus.$disconnect();
      }
    };
  } finally {
    await db.$disconnect();
  }
}
