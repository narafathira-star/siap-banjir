import type { Metadata } from "next";
import { Bell, MapPin, ShieldCheck } from "lucide-react";
import { KepalaHalaman } from "@/components/layout/kepala-halaman";
import { PengaturanNotifikasi } from "@/components/notifikasi/pengaturan-notifikasi";
import { PilihWilayah } from "@/components/wilayah/pilih-wilayah";
import { muatPemilih } from "@/server/wilayah-terpilih";

export const metadata: Metadata = { title: "Pengaturan" };

type Props = { searchParams: Promise<{ wilayah?: string | string[] }> };

const KARTU = "flex flex-col gap-3.5 rounded-[20px] border bg-card p-4 text-card-foreground";
const JUDUL_KARTU = "flex items-center gap-2 text-[18px] font-extrabold";

/** Pengaturan (desain ulang, D-054): judul → kartu Wilayah → kartu Notifikasi → catatan privasi. */
export default async function PengaturanPage({ searchParams }: Props) {
  const { wilayah } = await searchParams;
  const { pemilih, desa, namaTerpilih } = await muatPemilih(wilayah);
  const terpilih = desa && namaTerpilih ? { idWilayah: desa.wilayah.idWilayah, namaWilayah: namaTerpilih } : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <KepalaHalaman judul="Pengaturan" subjudul="Atur wilayah pantauan dan notifikasi di perangkat ini." />

      <section aria-labelledby="judul-wilayah" className={KARTU}>
        <h2 id="judul-wilayah" className={JUDUL_KARTU}>
          <MapPin className="size-[22px] text-primary" strokeWidth={2} aria-hidden="true" />
          Wilayah
        </h2>
        <PilihWilayah data={pemilih} namaTerpilih={namaTerpilih} />
      </section>

      <section aria-labelledby="judul-notif" className={KARTU}>
        <h2 id="judul-notif" className={JUDUL_KARTU}>
          <Bell className="size-[22px] text-primary" strokeWidth={2} aria-hidden="true" />
          Notifikasi
        </h2>
        <PengaturanNotifikasi wilayah={terpilih} />
      </section>

      <p className="flex items-start gap-2.5 rounded-[14px] border bg-card px-3.5 py-3 text-[13px] leading-normal text-[#2d3748]">
        <ShieldCheck className="mt-px size-[18px] shrink-0 text-risk-rendah" strokeWidth={2.2} aria-hidden="true" />
        Siap Banjir tidak memakai akun dan tidak menyimpan nama atau nomor HP. Perangkat dikenali lewat token acak di
        browser ini dan langganan notifikasi push.
      </p>
    </div>
  );
}
