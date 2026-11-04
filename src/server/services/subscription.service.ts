/**
 * Perangkat & LanggananNotifikasi (use case "Atur Notifikasi").
 * Pengguna tanpa login: identitas = deviceToken acak per browser + push subscription.
 */
import type { TingkatRisiko } from "@prisma/client";
import { db } from "@/server/db";
import { dekripsiJson, enkripsiJson } from "@/server/enkripsi";
import { URUTAN_LEVEL } from "@/lib/risiko";
import {
  pushSubscriptionSchema,
  type PushSubscriptionJson,
} from "@/server/validators/push";

type DataPerangkat = {
  deviceToken: string;
  jenisPerangkat: string;
  browser: string;
  idWilayah: string;
};

/** daftarkanPerangkat(): buat/perbarui Pengguna + Perangkat. Mengembalikan idPerangkat. */
export async function daftarkanPerangkat(data: DataPerangkat) {
  const ada = await db.perangkat.findUnique({
    where: { deviceToken: data.deviceToken },
  });
  if (ada) {
    await db.$transaction([
      db.perangkat.update({
        where: { idPerangkat: ada.idPerangkat },
        data: { jenisPerangkat: data.jenisPerangkat, browser: data.browser },
      }),
      db.pengguna.update({
        where: { idPengguna: ada.idPengguna },
        data: { wilayahPreferensi: data.idWilayah },
      }),
    ]);
    return ada.idPerangkat;
  }
  const pengguna = await db.pengguna.create({
    data: {
      wilayahPreferensi: data.idWilayah,
      perangkat: {
        create: {
          deviceToken: data.deviceToken,
          jenisPerangkat: data.jenisPerangkat,
          browser: data.browser,
        },
      },
    },
    include: { perangkat: true },
  });
  const perangkat = pengguna.perangkat[0];
  if (!perangkat) throw new Error("Perangkat gagal dibuat");
  return perangkat.idPerangkat;
}

/** aktifkan(idPerangkat, wilayah): simpan/perbarui langganan dengan status aktif. */
export async function aktifkan(
  idPerangkat: string,
  data: {
    idWilayah: string;
    subscription: PushSubscriptionJson;
    levelMinimum: TingkatRisiko;
  },
) {
  const isi = {
    idWilayah: data.idWilayah,
    pushSubscription: enkripsiJson(data.subscription),
    pushEndpoint: data.subscription.endpoint,
    levelMinimum: data.levelMinimum,
    status: true,
  };
  const [, langganan] = await db.$transaction([
    // Endpoint yang sama bisa tertinggal di perangkat lama (misal localStorage dihapus).
    db.langgananNotifikasi.deleteMany({
      where: { pushEndpoint: isi.pushEndpoint, NOT: { idPerangkat } },
    }),
    db.langgananNotifikasi.upsert({
      where: { idPerangkat },
      create: { idPerangkat, ...isi },
      update: isi,
    }),
  ]);
  return langganan;
}

/** Nonaktifkan notifikasi tanpa menghapus subscription (bisa diaktifkan lagi tanpa izin ulang). */
export async function nonaktifkan(endpoint: string) {
  const hasil = await db.langgananNotifikasi.updateMany({
    where: { pushEndpoint: endpoint },
    data: { status: false },
  });
  return hasil.count > 0;
}

export async function lihatLanggananByEndpoint(endpoint: string) {
  return db.langgananNotifikasi.findUnique({
    where: { pushEndpoint: endpoint },
  });
}

export async function hapusLangganan(idLangganan: string) {
  await db.langgananNotifikasi.deleteMany({ where: { idLangganan } });
}

/** Apakah level risiko memenuhi level minimum langganan (RENDAH tidak pernah dikirim). */
export function memenuhiLevelMinimum(
  level: TingkatRisiko,
  levelMinimum: TingkatRisiko,
) {
  return (
    level !== "RENDAH" && URUTAN_LEVEL[level] >= URUTAN_LEVEL[levelMinimum]
  );
}

/** cariLanggananAktif(idWilayah): status aktif dan levelMinimum terpenuhi. */
export async function cariLanggananAktif(
  idWilayah: string,
  level: TingkatRisiko,
) {
  const daftar = await db.langgananNotifikasi.findMany({
    where: { idWilayah, status: true },
  });
  return daftar.filter((l) => memenuhiLevelMinimum(level, l.levelMinimum));
}

export function bacaPushSubscription(
  json: unknown,
): PushSubscriptionJson | null {
  const hasil = pushSubscriptionSchema.safeParse(dekripsiJson(json));
  return hasil.success ? hasil.data : null;
}
