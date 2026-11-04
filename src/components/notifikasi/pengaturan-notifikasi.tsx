"use client";

import { useId, useState } from "react";
import type { TingkatRisiko } from "@prisma/client";
import { LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { GAYA_LEVEL } from "@/components/risiko/gaya-level";
import { cn } from "@/lib/utils";
import type { LevelMinimum, StatusPush } from "@/hooks/usePushSubscription";
import { pesanGalat, useNotifikasi } from "./notifikasi-provider";

const KETERANGAN_STATUS: Record<StatusPush, string> = {
  memuat: "Memeriksa status notifikasi…",
  "tidak-didukung":
    "Browser ini tidak mendukung notifikasi push. Di iPhone/iPad, tambahkan Siap Banjir ke Layar Utama terlebih dahulu.",
  "belum-dikonfigurasi": "Notifikasi push belum dikonfigurasi di server.",
  ditolak:
    "Izin notifikasi ditolak. Buka pengaturan situs di browser (ikon gembok di bilah alamat), izinkan Notifikasi, lalu muat ulang halaman.",
  "belum-aktif": "Belum aktif. Nyalakan untuk menerima peringatan di perangkat ini.",
  aktif: "Aktif. Anda akan menerima peringatan di perangkat ini.",
  nonaktif: "Nonaktif. Anda tidak akan menerima peringatan.",
};

/** Chip level (board Pengaturan) berisi ikon + teks; label pembaca layar ada di `nama`. */
const OPSI_LEVEL: { nilai: LevelMinimum; nama: string; chip: TingkatRisiko[]; keterangan: string }[] = [
  { nilai: "SEDANG", nama: "Sedang dan Tinggi", chip: ["SEDANG", "TINGGI"], keterangan: "Peringatan lebih awal (disarankan)" },
  { nilai: "TINGGI", nama: "Hanya Tinggi", chip: ["TINGGI"], keterangan: "Hanya saat bahaya potensi banjir" },
];

export function PengaturanNotifikasi({ wilayah }: { wilayah: { idWilayah: string; namaWilayah: string } | null }) {
  const { status, langganan, aktifkan, nonaktifkan, perbarui, kirimUji, bukaDialogIzin } = useNotifikasi();
  const [sibuk, setSibuk] = useState<null | "sakelar" | "level" | "uji">(null);
  const id = useId();

  const aktif = status === "aktif";
  const bisaDiubah = status === "aktif" || status === "nonaktif" || status === "belum-aktif";
  const levelMinimum = langganan?.levelMinimum ?? "SEDANG";

  async function jalankan(jenis: NonNullable<typeof sibuk>, aksi: () => Promise<void>) {
    setSibuk(jenis);
    try {
      await aksi();
    } catch (err) {
      toast.error(pesanGalat(err));
    } finally {
      setSibuk(null);
    }
  }

  function ubahSakelar(nyala: boolean) {
    if (!wilayah) return;
    if (!nyala) {
      void jalankan("sakelar", async () => {
        await nonaktifkan();
        toast.info("Notifikasi dinonaktifkan.");
      });
      return;
    }
    // Izin browser belum pernah diminta → tampilkan dialog penjelasan dulu.
    if (Notification.permission === "default") {
      bukaDialogIzin(wilayah);
      return;
    }
    void jalankan("sakelar", async () => {
      if (await aktifkan(wilayah.idWilayah, levelMinimum)) toast.success(`Peringatan aktif untuk ${wilayah.namaWilayah}.`);
    });
  }

  const nonaktifSemua = !bisaDiubah || !wilayah || sibuk !== null;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span id={`${id}-label`} className="text-[16px] font-extrabold">
            Peringatan banjir
          </span>
          <span id={`${id}-status`} className="text-[14px] leading-[1.45] text-[#3e4a5c]" aria-live="polite">
            {KETERANGAN_STATUS[status]}
          </span>
          {!wilayah && bisaDiubah ? <span className="text-[14px] font-bold">Pilih wilayah terlebih dahulu.</span> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {sibuk === "sakelar" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {/* Sakelar board: 58 × 34 px, biru saat aktif, abu-abu #8A95A6 saat mati. */}
          <button
            type="button"
            role="switch"
            aria-checked={aktif}
            aria-labelledby={`${id}-label`}
            aria-describedby={`${id}-status`}
            disabled={nonaktifSemua}
            onClick={() => ubahSakelar(!aktif)}
            className={cn(
              "flex h-[34px] w-[58px] items-center rounded-full p-[3px] disabled:cursor-not-allowed disabled:opacity-50",
              aktif ? "bg-primary" : "bg-[#8a95a6]",
            )}
          >
            <span
              className={cn(
                "size-7 rounded-full bg-white shadow-[0_1px_3px_rgba(14,23,38,0.3)] motion-safe:transition-transform",
                aktif && "translate-x-6",
              )}
            />
          </button>
        </div>
      </div>

      <fieldset disabled={!aktif || sibuk !== null} className="flex flex-col gap-2.5 disabled:opacity-60">
        <legend className="mb-2.5 text-[15px] font-extrabold">Kirim peringatan untuk level</legend>
        {OPSI_LEVEL.map((o) => (
          <label
            key={o.nilai}
            className="flex min-h-16 cursor-pointer items-center gap-3 rounded-[14px] border-2 border-border bg-card px-3.5 py-3 has-[:checked]:border-primary has-[:checked]:bg-[#f1f5fe] has-[:disabled]:cursor-not-allowed"
          >
            <input
              type="radio"
              name={`${id}-level`}
              value={o.nilai}
              checked={levelMinimum === o.nilai}
              onChange={() =>
                void jalankan("level", async () => {
                  await perbarui({ levelMinimum: o.nilai });
                  toast.success("Level minimum disimpan.");
                })
              }
              className="size-[22px] shrink-0 accent-primary"
            />
            <span className="flex flex-col gap-1">
              <span className="sr-only">{o.nama}: </span>
              <span className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
                {o.chip.map((l) => {
                  const Ikon = GAYA_LEVEL[l].ikon;
                  return (
                    <span
                      key={l}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full py-[3px] pr-2.5 pl-2 text-[13px] font-extrabold",
                        GAYA_LEVEL[l].solid,
                      )}
                    >
                      <Ikon className="size-3.5" strokeWidth={2.6} />
                      {l === "SEDANG" ? "Sedang" : "Tinggi"}
                    </span>
                  );
                })}
              </span>
              <span className="text-[14px] text-[#3e4a5c]">{o.keterangan}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        disabled={!aktif || sibuk !== null}
        onClick={() =>
          void jalankan("uji", async () => {
            await kirimUji();
            toast.success("Notifikasi uji dikirim. Periksa notifikasi perangkat Anda.");
          })
        }
        className="inline-flex min-h-[46px] items-center gap-2 self-start rounded-xl border border-[#9aa6b8] bg-card px-4 text-[15px] font-bold transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sibuk === "uji" ? (
          <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
        ) : (
          <Send className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
        )}
        Kirim notifikasi uji
      </button>
      <p className="text-[13px] leading-normal text-muted-foreground">
        Peringatan yang sama tidak dikirim ulang dalam 6 jam, kecuali level naik dari Sedang ke Tinggi.
      </p>
    </div>
  );
}
