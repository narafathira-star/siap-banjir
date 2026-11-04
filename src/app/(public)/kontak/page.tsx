import type { Metadata } from "next";
import Link from "next/link";
import { Info, MapPin } from "lucide-react";
import { DaftarNomorDarurat } from "@/components/kontak/daftar-nomor-darurat";
import { TautanKembali } from "@/components/kontak/tautan-kembali";
import { SUMBER_NOMOR_NASIONAL } from "@/data/nomor-nasional";
import { formatTanggalLokalPanjang } from "@/lib/format";
import { lihatDesa, namaTampilan, nomorDaruratWilayah } from "@/server/services/wilayah.service";
import { idWilayahTerpilih } from "@/server/wilayah-terpilih";

export const metadata: Metadata = { title: "Nomor Darurat" };

type Props = { searchParams: Promise<{ wilayah?: string | string[] }> };

/**
 * Nomor Darurat (desain ulang, D-050): nomor utama besar + nomor lainnya, konfirmasi sebelum menelepon.
 * Tanpa wilayah tetap berfungsi dengan nomor nasional.
 */
export default async function KontakPage({ searchParams }: Props) {
  const { wilayah } = await searchParams;
  const id = await idWilayahTerpilih(wilayah);
  const desa = id ? await lihatDesa(id) : null;
  const nomor = nomorDaruratWilayah(desa?.leluhur ?? []);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <header className="flex flex-col gap-2.5">
        <TautanKembali />
        <h1 className="text-[28px] leading-[1.2] font-extrabold tracking-[-0.02em]">Nomor Darurat</h1>
        {desa ? (
          <p className="flex items-center gap-2 text-[15px] font-bold">
            <MapPin className="size-5 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
            {namaTampilan(desa.leluhur)}
          </p>
        ) : (
          <p className="text-[14px] leading-normal text-[#3e4a5c]">
            Wilayah belum dipilih, jadi yang tampil nomor nasional.{" "}
            <Link href="/pengaturan" className="font-bold text-primary underline underline-offset-2 hover:no-underline">
              Pilih wilayah
            </Link>{" "}
            untuk melihat BPBD setempat dan status layanan 112.
          </p>
        )}
        <p className="text-[15px] leading-[1.45] text-[#3e4a5c]">Ketuk nomor, lalu konfirmasi untuk menelepon.</p>
      </header>

      {nomor.catatan112 && (
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-[14px] border border-[#d9b300] bg-risk-sedang-tint p-3.5 text-[#4a3b00]"
        >
          <Info className="mt-0.5 size-5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-extrabold">{nomor.catatan112.judul}</span>
            <span className="text-[14px] leading-[1.45]">{nomor.catatan112.isi}</span>
          </span>
        </div>
      )}

      <DaftarNomorDarurat nomor={nomor} />

      <section aria-labelledby="judul-sumber-nasional" className="flex flex-col gap-1.5 text-[13px] leading-normal text-[#3e4a5c]">
        <h2 id="judul-sumber-nasional" className="font-bold text-[#2d3748]">
          Sumber nomor darurat nasional
        </h2>
        <ul className="flex flex-col gap-1">
          {SUMBER_NOMOR_NASIONAL.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline underline-offset-2 hover:no-underline"
              >
                {s.nama}
                <span className="sr-only"> (membuka tab baru)</span>
              </a>{" "}
              ({s.nomor.join(", ")}), diperiksa {formatTanggalLokalPanjang(s.diperiksaPada)}.
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
