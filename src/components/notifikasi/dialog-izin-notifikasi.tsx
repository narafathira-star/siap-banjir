"use client";

import { BellRing, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DialogIzinNotifikasi({
  terbuka,
  namaWilayah,
  ditolak,
  tidakDidukung,
  sibuk,
  onIzinkan,
  onNanti,
}: {
  terbuka: boolean;
  namaWilayah: string;
  ditolak: boolean;
  tidakDidukung: boolean;
  sibuk: boolean;
  onIzinkan: () => void;
  onNanti: () => void;
}) {
  return (
    <Dialog open={terbuka} onOpenChange={(buka) => !buka && !sibuk && onNanti()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 sm:mx-0">
            <BellRing className="size-7 text-primary" aria-hidden="true" />
          </div>
          <DialogTitle className="text-xl">Aktifkan peringatan banjir?</DialogTitle>
          <DialogDescription className="text-base">
            Siap Banjir akan mengirim notifikasi ke perangkat ini saat risiko banjir di{" "}
            <strong className="text-foreground">{namaWilayah}</strong> mencapai level Sedang atau Tinggi.
          </DialogDescription>
        </DialogHeader>

        {tidakDidukung ? (
          <p className="rounded-md bg-muted p-3 text-sm">
            Browser ini belum mendukung notifikasi push. Di iPhone/iPad, tambahkan Siap Banjir ke Layar Utama terlebih
            dahulu.
          </p>
        ) : ditolak ? (
          <p className="rounded-md bg-muted p-3 text-sm">
            Izin notifikasi sebelumnya ditolak. Buka pengaturan situs di browser (ikon gembok di bilah alamat), izinkan
            Notifikasi, lalu coba lagi.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Tanpa akun: tidak ada nama atau nomor HP yang disimpan.</li>
            <li>Level minimum dan wilayah bisa diubah kapan saja di halaman Pengaturan.</li>
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" size="lg" onClick={onNanti} disabled={sibuk}>
            Nanti saja
          </Button>
          <Button size="lg" onClick={onIzinkan} disabled={sibuk || ditolak || tidakDidukung}>
            {sibuk ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
            Izinkan notifikasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
