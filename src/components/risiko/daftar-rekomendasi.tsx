import Link from "next/link";
import type { TingkatRisiko } from "@prisma/client";
import { ExternalLink, Waves } from "lucide-react";
import { LABEL_LEVEL } from "@/lib/risiko";
import type { RekomendasiKlien } from "@/lib/tipe-risiko";
import { cn } from "@/lib/utils";

/** "BNPB, Buku Saku ..., hal. 36" → { dokumen: "BNPB, Buku Saku ...", halaman: "hal. 36" }. */
function pisahSumber(nama: string) {
  const i = nama.lastIndexOf(", hal. ");
  return i < 0 ? { dokumen: nama, halaman: null } : { dokumen: nama.slice(0, i), halaman: nama.slice(i + 2) };
}

const WARNA_NOMOR: Record<TingkatRisiko, string> = {
  RENDAH: "bg-risk-rendah-tint text-risk-rendah-teks",
  SEDANG: "bg-risk-sedang-tint text-risk-sedang-teks",
  TINGGI: "bg-risk-tinggi-tint text-risk-tinggi-teks",
};

function Daftar({ items, level }: { items: RekomendasiKlien[]; level: TingkatRisiko }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((r, i) => {
        const sumber = r.sumberNama ? pisahSumber(r.sumberNama) : null;
        return (
          <li key={r.idRekomendasi} className="flex items-start gap-3 rounded-xl border p-3">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[14px] font-extrabold",
                WARNA_NOMOR[level],
              )}
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] leading-[1.45] text-[#1f2937]">{r.isiRekomendasi}</span>
              {r.sumberUrl && sumber && (
                <a
                  href={r.sumberUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 self-start text-[12.5px] font-bold text-primary underline underline-offset-2 hover:no-underline"
                >
                  Sumber: {sumber.halaman ?? "dokumen"}
                  <ExternalLink className="size-3" aria-hidden="true" />
                  <span className="sr-only">({sumber.dokumen}, membuka tab baru)</span>
                </a>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Detail Mitigasi: langkah siaga, lalu (level TINGGI) "Jika banjir terjadi", dengan halaman sumbernya. */
export function DaftarRekomendasi({ level, items }: { level: TingkatRisiko; items: RekomendasiKlien[] }) {
  if (items.length === 0) return <p className="text-[15px] text-muted-foreground">Belum ada rekomendasi.</p>;
  const siaga = items.filter((r) => r.bagian !== "JIKA_BANJIR");
  const jikaBanjir = items.filter((r) => r.bagian === "JIKA_BANJIR");
  const dokumen = [...new Set(items.flatMap((r) => (r.sumberNama ? [pisahSumber(r.sumberNama).dokumen] : [])))];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] leading-normal text-[#3e4a5c]">
        Langkah mitigasi saat risiko {LABEL_LEVEL[level].toLowerCase()}.
      </p>
      {siaga.length > 0 && <Daftar items={siaga} level={level} />}
      {jikaBanjir.length > 0 && (
        <section aria-labelledby="judul-jika-banjir" className="mt-2 flex flex-col gap-2.5">
          <h3 id="judul-jika-banjir" className="flex items-center gap-2 text-[16px] font-extrabold">
            <Waves className="size-5 text-primary" aria-hidden="true" />
            Jika banjir terjadi
          </h3>
          <Daftar items={jikaBanjir} level={level} />
          <p className="text-[14px] leading-normal">
            Langkah setelah banjir surut ada di{" "}
            <Link href="/informasi" className="font-bold text-primary underline underline-offset-2 hover:no-underline">
              halaman Informasi
            </Link>
            .
          </p>
        </section>
      )}
      {dokumen.length > 0 && <p className="text-[13px] leading-normal text-muted-foreground">Sumber: {dokumen.join("; ")}.</p>}
    </div>
  );
}
