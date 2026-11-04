/**
 * Use case sistem "Kirim Notifikasi" (sequence diagram langkah 8):
 * buatNotifikasi(levelRisiko) → cariLanggananAktif(idWilayah) → kirimNotifikasi().
 */
import type { LanggananNotifikasi, LevelRisiko, TingkatRisiko } from "@prisma/client";
import { db } from "@/server/db";
import { formatJamZona } from "@/lib/format";
import { LABEL_SIMULASI, URUTAN_LEVEL } from "@/lib/risiko";
import { zonaWilayah } from "@/lib/zona-waktu";
import { kirimPush, type PayloadPush } from "@/server/integrations/web-push";
import {
  bacaPushSubscription,
  cariLanggananAktif,
  hapusLangganan,
  lihatLanggananByEndpoint,
} from "@/server/services/subscription.service";
import { lihatWilayahLengkap, namaTampilan } from "@/server/services/wilayah.service";

export const JEDA_ANTI_SPAM_MS = 6 * 60 * 60 * 1000;

/**
 * Anti-spam: jangan kirim ulang untuk wilayah + level yang sama dalam 6 jam,
 * kecuali level naik (Sedang → Tinggi). `levelTerkirim` = level notifikasi yang
 * sudah dikirim ke langganan ini untuk wilayah yang sama dalam 6 jam terakhir.
 */
export function perluKirim(levelBaru: TingkatRisiko, levelTerkirim: TingkatRisiko[]) {
  if (levelBaru === "RENDAH") return false;
  return levelTerkirim.every((l) => URUTAN_LEVEL[levelBaru] > URUTAN_LEVEL[l]);
}

/**
 * buatNotifikasi(levelRisiko): judul, pesan, dan URL deep link.
 * Pesan diawali jam penilaian risiko dalam zona wilayah, mis. "Pukul 14:05 WITA:" (D-060).
 */
export function buatNotifikasi(
  risiko: Pick<LevelRisiko, "idWilayah" | "level" | "deskripsi" | "simulasi" | "waktu">,
  namaWilayah: string,
): PayloadPush {
  const tinggi = risiko.level === "TINGGI";
  const judul = tinggi ? `⚠️ Risiko banjir TINGGI di ${namaWilayah}` : `Waspada: risiko banjir SEDANG di ${namaWilayah}`;
  const saran = tinggi ? "Siap mengungsi dan ikuti arahan petugas." : "Periksa persiapan dini Anda.";
  // Label sudah ada di judul; di isi diganti kalimat penjelas.
  const deskripsi = `Pukul ${formatJamZona(risiko.waktu, zonaWilayah(risiko.idWilayah))}: ${risiko.deskripsi.replace(`${LABEL_SIMULASI} `, "")}`;
  return {
    judul: risiko.simulasi ? `${LABEL_SIMULASI} ${judul}` : judul,
    pesan: risiko.simulasi
      ? `${deskripsi} Ini simulasi uji, bukan kondisi cuaca sebenarnya.`
      : `${deskripsi} ${saran}`,
    // #penanganan → state machine langsung ke Detail Penanganan.
    url: `/risiko?wilayah=${encodeURIComponent(risiko.idWilayah)}#penanganan`,
    // Tag berbeda agar notifikasi simulasi tidak menggantikan peringatan asli di perangkat.
    tag: `${risiko.simulasi ? "simulasi-" : ""}risiko-${risiko.idWilayah}`,
    level: risiko.level,
  };
}

/**
 * Level yang sudah terkirim (atau sedang dikirim) per langganan untuk wilayah ini dalam 6 jam.
 * Notifikasi simulasi dan asli dihitung terpisah: simulasi tidak menahan peringatan asli.
 */
async function riwayatTerkirim(idLangganan: string[], idWilayah: string, simulasi: boolean, sekarang: Date) {
  const riwayat = await db.notifikasi.findMany({
    where: {
      idLangganan: { in: idLangganan },
      waktuKirim: { gte: new Date(sekarang.getTime() - JEDA_ANTI_SPAM_MS) },
      statusKirim: { in: ["PENDING", "TERKIRIM"] },
      levelRisiko: { idWilayah, simulasi },
    },
    select: { idLangganan: true, levelRisiko: { select: { level: true } } },
  });
  const peta = new Map<string, TingkatRisiko[]>();
  for (const r of riwayat) peta.set(r.idLangganan, [...(peta.get(r.idLangganan) ?? []), r.levelRisiko.level]);
  return peta;
}

/** kirimNotifikasi(): kirim ke satu langganan, catat Notifikasi, hapus subscription 404/410. */
async function kirimNotifikasi(langganan: LanggananNotifikasi, risiko: LevelRisiko, payload: PayloadPush) {
  const notifikasi = await db.notifikasi.create({
    data: {
      idLangganan: langganan.idLangganan,
      idLevelRisiko: risiko.idRisiko,
      judul: payload.judul,
      pesan: payload.pesan,
    },
  });

  const subscription = bacaPushSubscription(langganan.pushSubscription);
  const hasil = subscription
    ? await kirimPush(subscription, payload, { urgensi: risiko.level === "TINGGI" ? "high" : "normal" })
    : ({ ok: false, kedaluwarsa: true, pesan: "pushSubscription tidak valid" } as const);

  if (hasil.ok) {
    await db.notifikasi.update({
      where: { idNotifikasi: notifikasi.idNotifikasi },
      data: { statusKirim: "TERKIRIM", waktuKirim: new Date() },
    });
    return "TERKIRIM" as const;
  }

  if (hasil.kedaluwarsa) {
    // Menghapus langganan ikut menghapus notifikasinya (cascade).
    await hapusLangganan(langganan.idLangganan);
    return "DIHAPUS" as const;
  }

  console.error(`[push] Gagal kirim ke langganan ${langganan.idLangganan}:`, hasil.status, hasil.pesan);
  await db.notifikasi.update({ where: { idNotifikasi: notifikasi.idNotifikasi }, data: { statusKirim: "GAGAL" } });
  return "GAGAL" as const;
}

export type RingkasanPeringatan = {
  terkirim: number;
  gagal: number;
  dihapus: number;
  dilewati: number;
};

/**
 * alt [level Sedang/Tinggi]: kirim peringatan ke semua langganan aktif di wilayah.
 * [else]: tidak ada notifikasi.
 */
export async function prosesPeringatan(risiko: LevelRisiko, sekarang = new Date()): Promise<RingkasanPeringatan> {
  const ringkasan: RingkasanPeringatan = { terkirim: 0, gagal: 0, dihapus: 0, dilewati: 0 };
  if (risiko.level === "RENDAH") return ringkasan;

  const langganan = await cariLanggananAktif(risiko.idWilayah, risiko.level);
  if (langganan.length === 0) return ringkasan;
  const wilayah = await lihatWilayahLengkap(risiko.idWilayah);
  if (!wilayah) return ringkasan;

  const riwayat = await riwayatTerkirim(
    langganan.map((l) => l.idLangganan),
    risiko.idWilayah,
    risiko.simulasi,
    sekarang,
  );
  const payload = buatNotifikasi(risiko, namaTampilan(wilayah.leluhur));

  const target = langganan.filter((l) => perluKirim(risiko.level, riwayat.get(l.idLangganan) ?? []));
  ringkasan.dilewati = langganan.length - target.length;

  const hasil = await Promise.all(target.map((l) => kirimNotifikasi(l, risiko, payload)));
  for (const h of hasil) {
    if (h === "TERKIRIM") ringkasan.terkirim++;
    else if (h === "GAGAL") ringkasan.gagal++;
    else ringkasan.dihapus++;
  }
  return ringkasan;
}

/** Notifikasi uji dari halaman Pengaturan. Tidak dicatat di tabel Notifikasi (tidak terkait LevelRisiko). */
export async function kirimNotifikasiUji(endpoint: string) {
  const langganan = await lihatLanggananByEndpoint(endpoint);
  if (!langganan) return { status: "tidak-ditemukan" } as const;

  const subscription = bacaPushSubscription(langganan.pushSubscription);
  if (!subscription) {
    await hapusLangganan(langganan.idLangganan);
    return { status: "kedaluwarsa" } as const;
  }

  const hasil = await kirimPush(subscription, {
    judul: "Notifikasi uji Siap Banjir",
    pesan: "Notifikasi berfungsi. Anda akan menerima peringatan saat risiko banjir terdeteksi.",
    url: `/risiko?wilayah=${encodeURIComponent(langganan.idWilayah)}`,
    tag: "uji",
  }, { ttlDetik: 60 });

  if (hasil.ok) return { status: "terkirim" } as const;
  if (hasil.kedaluwarsa) {
    await hapusLangganan(langganan.idLangganan);
    return { status: "kedaluwarsa" } as const;
  }
  return { status: "gagal", pesan: hasil.pesan } as const;
}
