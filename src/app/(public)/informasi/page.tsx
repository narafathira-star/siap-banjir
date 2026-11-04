import Link from "next/link";
import type { Metadata } from "next";
import { TabInformasi, type TabInformasiId } from "@/components/informasi/tab-informasi";
import { TanggalInformasi } from "@/components/informasi/tanggal-informasi";
import { TautanSumber } from "@/components/informasi/tautan-sumber";
import { KepalaHalaman } from "@/components/layout/kepala-halaman";
import { lihatInformasi } from "@/server/services/content.service";
import { idWilayahTerpilih } from "@/server/wilayah-terpilih";

export const metadata: Metadata = { title: "Informasi" };

type Props = { searchParams: Promise<{ wilayah?: string | string[]; tab?: string | string[] }> };

type ItemInformasi = Awaited<ReturnType<typeof lihatInformasi>>[number];

/** Cuplikan satu paragraf: butir daftar "- …" digabung dengan koma, seperti contoh di board. */
function cuplikan(isi: string) {
  let hasil = "";
  let butirSebelumnya = false;
  for (const baris of isi.split("\n").map((b) => b.trim()).filter(Boolean)) {
    const butir = baris.startsWith("- ");
    const teks = butir ? baris.slice(2) : baris;
    if (!hasil) hasil = teks;
    else if (butir && butirSebelumnya) hasil += `, ${teks}`;
    else hasil += /[.:;!?]$/.test(hasil) ? ` ${teks}` : `. ${teks}`;
    butirSebelumnya = butir;
  }
  return hasil;
}

/** Kartu artikel (board Informasi): judul, tanggal · wilayah, cuplikan dua baris, sumber. */
function DaftarInformasi({ items, kosong }: { items: ItemInformasi[]; kosong: string }) {
  if (items.length === 0) return <p className="text-[15px] text-[#3e4a5c]">{kosong}</p>;
  return (
    <ul className="flex flex-col gap-3">
      {items.map((i) => (
        <li key={i.idInformasi}>
          {/* Seluruh kartu bisa diklik lewat tautan judul (after:inset-0); tautan sumber di atasnya (z-10). */}
          <article className="relative flex flex-col gap-1.5 rounded-2xl border bg-card p-4 text-card-foreground transition-colors hover:border-primary/40">
            <h2 className="text-[16px] leading-[1.35] font-extrabold">
              <Link
                href={`/informasi/${i.idInformasi}`}
                className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-primary"
              >
                {i.judul}
              </Link>
            </h2>
            <p className="text-[12.5px] font-semibold text-muted-foreground">
              <TanggalInformasi kategori={i.kategori} tanggal={i.tanggal} idWilayah={i.idWilayah} dataPer={i.tanggalDataPer} />
              {i.wilayah ? ` · ${i.wilayah.namaWilayah}` : null}
            </p>
            <p className="line-clamp-2 text-[14px] leading-normal text-[#1f2937]">{cuplikan(i.isi)}</p>
            <TautanSumber nama={i.sumberNama} url={i.sumberUrl} className="relative z-10 mt-0.5 text-[13px] text-[#3e4a5c]" />
            <TautanSumber
              label="Tanggal kejadian"
              nama={i.sumberTanggalNama}
              url={i.sumberTanggalUrl}
              className="relative z-10 text-[13px] text-[#3e4a5c]"
            />
          </article>
        </li>
      ))}
    </ul>
  );
}

/** Informasi (desain ulang, D-053): judul → tab Informasi umum | Riwayat kejadian → kartu artikel. */
export default async function InformasiPage({ searchParams }: Props) {
  const { wilayah, tab } = await searchParams;
  const idWilayah = (await idWilayahTerpilih(wilayah)) ?? undefined;
  const [umum, riwayat] = await Promise.all([
    lihatInformasi({ kategori: "UMUM", idWilayah }),
    lihatInformasi({ kategori: "RIWAYAT_KEJADIAN", idWilayah }),
  ]);
  const awal: TabInformasiId = tab === "riwayat" ? "riwayat" : "umum";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <KepalaHalaman judul="Informasi" subjudul="Artikel seputar banjir dan riwayat kejadian banjir." />
      <TabInformasi
        awal={awal}
        tab={{
          umum: {
            label: "Informasi umum",
            jumlah: umum.length,
            isi: <DaftarInformasi items={umum} kosong="Belum ada artikel." />,
          },
          riwayat: {
            label: "Riwayat kejadian",
            jumlah: riwayat.length,
            isi: <DaftarInformasi items={riwayat} kosong="Belum ada riwayat kejadian." />,
          },
        }}
      />
    </div>
  );
}
