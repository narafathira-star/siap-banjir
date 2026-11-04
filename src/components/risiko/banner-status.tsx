"use client";

import { CircleCheck, LoaderCircle, OctagonAlert, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StateRisiko } from "@/lib/mesin-risiko";
import { cn } from "@/lib/utils";
import { GAYA_LEVEL } from "./gaya-level";

function Langkah({ selesai, children }: { selesai: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {selesai ? (
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      )}
      <span>{children}</span>
    </li>
  );
}

/** Banner sesuai state machine: Bahaya, Detail Penanganan, atau Final. */
export function BannerStatus({
  state,
  onTutup,
  onLanjutPantau,
  onAktifkanNotifikasi,
}: {
  state: StateRisiko;
  onTutup: () => void;
  onLanjutPantau: () => void;
  onAktifkanNotifikasi: () => void;
}) {
  if (state.nama === "pemantauan") return null;

  if (state.nama === "selesai") {
    const normal = state.alasan === "normal";
    return (
      <div role="status" className="flex flex-col gap-3 rounded-[18px] border bg-card p-4 sm:flex-row sm:items-center">
        <ShieldCheck className={cn("size-8 shrink-0", normal ? "text-risk-rendah" : "text-muted-foreground")} aria-hidden="true" />
        <div className="flex-1">
          <p className="text-[16px] font-extrabold">{normal ? "Kondisi kembali normal" : "Peringatan ditutup"}</p>
          <p className="text-[14px] leading-normal text-muted-foreground">
            {normal
              ? "Risiko banjir sudah di bawah ambang. Tetap pantau informasi cuaca."
              : "Wilayah tetap dipantau. Peringatan muncul lagi jika level risiko naik."}
          </p>
        </div>
        <Button variant="outline" onClick={onLanjutPantau}>
          Lanjut memantau
        </Button>
      </div>
    );
  }

  const gaya = GAYA_LEVEL[state.data.level];
  const Ikon = state.data.level === "TINGGI" ? OctagonAlert : TriangleAlert;
  const kanal = state.kanal;

  return (
    <div role="alert" className={cn("rounded-[18px] border-2 p-4", gaya.lembut)}>
      <div className="flex items-start gap-3">
        <Ikon className={cn("mt-0.5 size-8 shrink-0", gaya.teks)} aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[18px] leading-[1.35] font-extrabold">
            {state.nama === "bahaya" ? "Bahaya potensi banjir terdeteksi" : "Ikuti langkah penanganan di bawah"}
          </p>
          <p className="text-[15px] leading-normal">{state.data.deskripsi}</p>

          {state.nama === "bahaya" ? (
            <ul className="space-y-1 text-[14px]" aria-label="Proses peringatan">
              <Langkah selesai={state.jalurPush === "notifikasi-terkirim"}>
                {state.jalurPush !== "notifikasi-terkirim"
                  ? "Mengirim peringatan…"
                  : kanal === "push"
                    ? "Notifikasi push dikirim ke perangkat ini"
                    : "Peringatan ditampilkan di aplikasi"}
              </Langkah>
              <Langkah selesai={state.jalurGrafik === "selesai-render"}>
                {state.jalurGrafik === "selesai-render" ? "Grafik curah hujan siap" : "Menyiapkan grafik curah hujan…"}
              </Langkah>
            </ul>
          ) : null}

          {kanal === "dalam-aplikasi" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onAktifkanNotifikasi}
              className="h-auto min-h-8 whitespace-normal bg-background py-1.5 text-left"
            >
              Aktifkan notifikasi push untuk wilayah ini
            </Button>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 -mt-2 shrink-0" onClick={onTutup} aria-label="Tutup peringatan">
          <X aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
