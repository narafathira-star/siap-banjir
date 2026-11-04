"use client";

import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { useNotifikasi } from "@/components/notifikasi/notifikasi-provider";
import { KARTU_KECIL } from "./kartu-ringkas";

type Wilayah = { idWilayah: string; namaWilayah: string } | null;

function Isi({ status, keterangan, aktif }: { status: string; keterangan: string; aktif: boolean }) {
  return (
    <>
      <span className="text-[13px] font-bold text-[#3e4a5c]">Peringatan dini</span>
      <Bell className="size-[34px] text-primary" strokeWidth={1.8} aria-hidden="true" />
      <span className={aktif ? "inline-flex items-center gap-1.5 text-[20px] font-extrabold text-risk-rendah-teks" : "text-[20px] font-extrabold"}>
        {aktif && <Check className="size-5" strokeWidth={2.6} aria-hidden="true" />}
        {status}
      </span>
      <span className="text-[14px] font-medium text-[#2d3748]">{keterangan}</span>
    </>
  );
}

/**
 * Status peringatan dini perangkat ini. Aktif/nonaktif → atur di Pengaturan;
 * belum pernah aktif → langsung buka dialog izin untuk wilayah yang dipantau.
 */
export function KartuPeringatanDini({ wilayah }: { wilayah: Wilayah }) {
  const { status, langganan, bukaDialogIzin } = useNotifikasi();

  if (status === "belum-aktif" && wilayah) {
    return (
      <button type="button" onClick={() => bukaDialogIzin(wilayah)} className={KARTU_KECIL}>
        <Isi status="Belum aktif" keterangan="Ketuk untuk mengaktifkan" aktif={false} />
      </button>
    );
  }

  const isi =
    status === "aktif"
      ? { status: "Aktif", keterangan: langganan?.levelMinimum === "TINGGI" ? "Level Tinggi" : "Level Sedang & Tinggi", aktif: true }
      : status === "memuat"
        ? { status: "Memeriksa…", keterangan: "Status notifikasi perangkat ini", aktif: false }
        : status === "ditolak"
          ? { status: "Izin ditolak", keterangan: "Atur di Pengaturan", aktif: false }
          : status === "tidak-didukung" || status === "belum-dikonfigurasi"
            ? { status: "Tidak tersedia", keterangan: "Browser ini belum mendukung notifikasi", aktif: false }
            : { status: "Nonaktif", keterangan: "Atur di Pengaturan", aktif: false };

  return (
    <Link href="/pengaturan" className={KARTU_KECIL} aria-busy={status === "memuat" || undefined}>
      <Isi {...isi} />
    </Link>
  );
}
