"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, X } from "lucide-react";
import { TautanSumber } from "@/components/informasi/tautan-sumber";
import { hrefTelepon, type KontakDarurat, type NomorDarurat } from "@/lib/kontak-darurat";
import { cn } from "@/lib/utils";

/**
 * Konfirmasi dua langkah sebelum menelepon (board "Nomor Darurat · Konfirmasi panggilan").
 * Fokus awal di "Batal" (pilihan paling aman); Escape juga membatalkan.
 */
function Konfirmasi({ kontak, besar, onBatal }: { kontak: KontakDarurat; besar: boolean; onBatal: () => void }) {
  const refBatal = useRef<HTMLButtonElement>(null);
  useEffect(() => refBatal.current?.focus(), []);
  const idJudul = `konfirmasi-${kontak.id}`;

  return (
    <div
      role="alertdialog"
      aria-labelledby={idJudul}
      aria-describedby={`${idJudul}-isi`}
      onKeyDown={(e) => e.key === "Escape" && onBatal()}
      className={cn(
        "flex flex-col gap-3 overflow-hidden border-2 border-darurat bg-darurat-lembut",
        besar ? "rounded-[22px] pb-4" : "rounded-2xl pb-3.5",
      )}
    >
      <button
        ref={refBatal}
        type="button"
        onClick={onBatal}
        className={cn(
          "flex items-center justify-center gap-2.5 border-b border-[#e3a9ac] bg-card font-extrabold text-foreground",
          besar ? "min-h-[116px] text-[20px]" : "min-h-[68px] text-[18px]",
        )}
      >
        <X className="size-[22px]" strokeWidth={2.4} aria-hidden="true" />
        Batal
      </button>
      <div className={cn("flex flex-col gap-1", besar ? "px-4" : "px-3.5")}>
        <p id={idJudul} className={cn("leading-[1.3] font-extrabold text-darurat-teks", besar ? "text-[20px]" : "text-[18px]")}>
          Telepon {kontak.telepon}?
        </p>
        <p id={`${idJudul}-isi`} className="text-[14px] leading-normal text-[#1f2937]">
          {kontak.nama}. Ponsel akan membuka panggilan ke nomor ini.
        </p>
      </div>
      <a
        href={hrefTelepon(kontak.telepon!)}
        className={cn(
          "flex items-center justify-center gap-2 bg-darurat font-extrabold text-darurat-foreground hover:opacity-90",
          besar ? "mx-4 min-h-14 rounded-[14px] text-[17px]" : "mx-3.5 min-h-[52px] rounded-xl text-[16px]",
        )}
      >
        <Phone className="size-5" strokeWidth={2.2} aria-hidden="true" />
        Ya, telepon
      </a>
    </div>
  );
}

/** Keterangan (mis. status 112, nomor WhatsApp) dan sumber resmi di bawah sebuah nomor. */
function Catatan({ kontak }: { kontak: KontakDarurat }) {
  if (!kontak.keterangan && !kontak.sumber) return null;
  return (
    <div className="mt-1.5 flex flex-col gap-0.5 px-1">
      {kontak.keterangan && <p className="text-[13px] leading-normal text-[#2d3748]">{kontak.keterangan}</p>}
      {kontak.sumber && (
        <TautanSumber nama={`${kontak.sumber.nama}, ${kontak.sumber.keterangan}`} url={kontak.sumber.url} className="text-[13px]" />
      )}
    </div>
  );
}

/** Nomor panjang (mis. "(0274) 555585") diperkecil agar muat satu baris. */
const nomorPanjang = (telepon: string) => telepon.length > 4;

export function DaftarNomorDarurat({ nomor }: { nomor: NomorDarurat }) {
  const [terbuka, setTerbuka] = useState<string | null>(null);
  const pemicu = useRef(new Map<string, HTMLButtonElement>());
  const kembaliKe = useRef<string | null>(null);

  // Setelah konfirmasi ditutup, fokus kembali ke tombol nomor yang membukanya.
  useEffect(() => {
    if (terbuka !== null || !kembaliKe.current) return;
    pemicu.current.get(kembaliKe.current)?.focus();
    kembaliKe.current = null;
  }, [terbuka]);

  const batal = (id: string) => {
    kembaliKe.current = id;
    setTerbuka(null);
  };
  const daftarkan = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) pemicu.current.set(id, el);
    else pemicu.current.delete(id);
  };

  const { utama, pendamping, lainnya } = nomor;

  return (
    <>
      <div>
        {utama.telepon && terbuka === utama.id ? (
          <Konfirmasi kontak={utama} besar onBatal={() => batal(utama.id)} />
        ) : (
          <button
            ref={daftarkan(utama.id)}
            type="button"
            onClick={() => setTerbuka(utama.id)}
            className="flex min-h-[120px] w-full items-center gap-4 rounded-[22px] bg-darurat p-[18px] text-left text-darurat-foreground hover:opacity-95"
          >
            <span className="flex size-[60px] shrink-0 items-center justify-center rounded-full bg-white text-darurat">
              <Phone className="size-[30px]" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span
                className={cn(
                  "leading-none font-extrabold tracking-[-0.02em] tabular-nums",
                  nomorPanjang(utama.telepon!) ? "text-[30px]" : "text-[44px]",
                )}
              >
                {utama.telepon}
              </span>
              <span className="text-[15px] font-bold">{utama.nama}</span>
            </span>
          </button>
        )}
        <Catatan kontak={utama} />
      </div>

      {pendamping.length > 0 && (
        // D-051: 112 belum diluncurkan dan tidak ada BPBD bernomor → nomor nasional ikut di atas.
        <section aria-labelledby="judul-pendamping" className="-mt-1 flex flex-col gap-2.5">
          <h2 id="judul-pendamping" className="text-[16px] font-extrabold text-[#2d3748]">
            Hubungi juga nomor darurat nasional
          </h2>
          <ul className="grid grid-cols-2 gap-2.5">
            {pendamping.map((k) =>
              terbuka === k.id ? (
                <li key={k.id} className="col-span-2">
                  <Konfirmasi kontak={k} besar={false} onBatal={() => batal(k.id)} />
                </li>
              ) : (
                <li key={k.id}>
                  <button
                    ref={daftarkan(k.id)}
                    type="button"
                    onClick={() => setTerbuka(k.id)}
                    className="flex min-h-[88px] w-full flex-col items-start justify-center gap-1 rounded-2xl border-2 border-darurat bg-card px-3.5 py-3 text-left text-card-foreground hover:bg-darurat-lembut"
                  >
                    <span className="inline-flex items-center gap-1.5 text-[26px] leading-none font-extrabold text-darurat tabular-nums">
                      <Phone className="size-5" strokeWidth={2.2} aria-hidden="true" />
                      {k.telepon}
                    </span>
                    <span className="text-[14px] leading-tight font-bold">{k.nama}</span>
                    <span className="text-[12px] leading-tight text-muted-foreground">{k.deskripsi}</span>
                  </button>
                </li>
              ),
            )}
          </ul>
        </section>
      )}

      {lainnya.length > 0 && (
        <section aria-labelledby="judul-nomor-lain" className="flex flex-col gap-2.5">
          <h2 id="judul-nomor-lain" className="mt-1 text-[16px] font-extrabold text-[#2d3748]">
            Nomor lainnya
          </h2>
          <ul className="flex flex-col gap-2.5">
            {lainnya.map((k) => (
              <li key={k.id}>
                {!k.telepon ? (
                  <div className="flex min-h-[72px] items-center gap-3 rounded-2xl border bg-card px-4 py-3">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[16px] font-bold">{k.nama}</span>
                      <span className="text-[13px] text-muted-foreground">{k.deskripsi}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-right text-[13px] font-semibold text-muted-foreground">
                      Nomor belum tersedia
                    </span>
                  </div>
                ) : terbuka === k.id ? (
                  <Konfirmasi kontak={k} besar={false} onBatal={() => batal(k.id)} />
                ) : (
                  <button
                    ref={daftarkan(k.id)}
                    type="button"
                    onClick={() => setTerbuka(k.id)}
                    className="flex min-h-[72px] w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left text-card-foreground hover:bg-[#f7f9fc]"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[16px] font-bold">{k.nama}</span>
                      <span className="text-[13px] text-muted-foreground">{k.deskripsi}</span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto inline-flex shrink-0 items-center gap-1.5 font-extrabold text-primary tabular-nums",
                        nomorPanjang(k.telepon) ? "text-[17px]" : "text-[22px]",
                      )}
                    >
                      <Phone className="size-5" strokeWidth={2.2} aria-hidden="true" />
                      {k.telepon}
                    </span>
                  </button>
                )}
                <Catatan kontak={k} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
