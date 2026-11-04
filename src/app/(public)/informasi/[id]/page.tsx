import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, MapPin } from "lucide-react";
import { TanggalInformasi } from "@/components/informasi/tanggal-informasi";
import { TautanSumber } from "@/components/informasi/tautan-sumber";
import { lihatDetailInformasi } from "@/server/services/content.service";

type Props = { params: Promise<{ id: string }> };

// cuid: huruf kecil + angka. Tolak id aneh sebelum menyentuh DB.
const idValid = (id: string) => /^[a-z0-9]{1,40}$/.test(id);

async function ambil(id: string) {
  return idValid(id) ? lihatDetailInformasi(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const info = await ambil((await params).id);
  return { title: info?.judul ?? "Informasi tidak ditemukan" };
}

export default async function InformasiDetailPage({ params }: Props) {
  const info = await ambil((await params).id);
  if (!info) notFound();
  const riwayat = info.kategori === "RIWAYAT_KEJADIAN";

  return (
    <article className="mx-auto flex max-w-xl flex-col gap-3">
      {/* Kembali ke tab asal artikel (D-053). */}
      <Link
        href={riwayat ? "/informasi?tab=riwayat" : "/informasi"}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-bold text-primary hover:text-primary-hover"
      >
        <ArrowLeft className="size-5" strokeWidth={2.2} aria-hidden="true" />
        Kembali ke Informasi
      </Link>
      <p className="text-[13px] font-bold tracking-wide text-primary uppercase">
        {riwayat ? "Riwayat kejadian" : "Informasi umum"}
      </p>
      <h1 className="text-[28px] leading-[1.2] font-extrabold tracking-[-0.02em] text-pretty">{info.judul}</h1>
      <p className="flex flex-wrap items-center gap-x-3 text-[14px] font-semibold text-muted-foreground">
        <TanggalInformasi
          kategori={info.kategori}
          tanggal={info.tanggal}
          idWilayah={info.idWilayah}
          dataPer={info.tanggalDataPer}
          panjang
        />
        {info.wilayah ? (
          <span className="flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" />
            {info.wilayah.namaWilayah}
          </span>
        ) : null}
      </p>
      <div className="flex flex-col gap-4 rounded-[20px] border bg-card p-4 text-[16px] leading-relaxed text-card-foreground">
        {info.isi.split("\n\n").map((paragraf, i) =>
          paragraf.includes("\n- ") || paragraf.startsWith("- ") ? (
            <ParagrafDaftar key={i} teks={paragraf} />
          ) : (
            <p key={i}>{paragraf}</p>
          ),
        )}
      </div>
      <TautanSumber nama={info.sumberNama} url={info.sumberUrl} className="text-[14px] text-[#3e4a5c]" />
      <TautanSumber
        label="Tanggal kejadian"
        nama={info.sumberTanggalNama}
        url={info.sumberTanggalUrl}
        className="-mt-2 text-[14px] text-[#3e4a5c]"
      />
    </article>
  );
}

/** Paragraf berisi baris "- item" dirender sebagai daftar. */
function ParagrafDaftar({ teks }: { teks: string }) {
  const baris = teks.split("\n");
  const pembuka = baris.filter((b) => !b.startsWith("- "));
  const item = baris.filter((b) => b.startsWith("- ")).map((b) => b.slice(2));
  return (
    <div>
      {pembuka.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <ul className="mt-2 list-disc space-y-1 pl-6">
        {item.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
