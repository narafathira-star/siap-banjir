import type { Metadata } from "next";
import { Phone, WifiOff } from "lucide-react";
import { TombolMuatUlang } from "@/components/layout/tombol-muat-ulang";

export const metadata: Metadata = { title: "Offline" };

// Halaman statis; disimpan service worker sebagai cadangan saat tidak ada koneksi.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <WifiOff className="size-14 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Anda sedang offline</h1>
      <p className="text-muted-foreground">
        Halaman ini belum tersimpan di perangkat. Halaman yang pernah Anda buka tetap bisa dilihat dengan data terakhir.
        Sambungkan internet untuk memperbarui cuaca dan level risiko.
      </p>
      <TombolMuatUlang />
      <div className="w-full rounded-lg border p-4 text-left">
        <p className="mb-2 flex items-center gap-2 font-semibold">
          <Phone className="size-4" aria-hidden="true" />
          Dalam keadaan darurat
        </p>
        <ul className="space-y-1">
          <li>
            Layanan darurat: <a href="tel:112" className="font-bold text-primary">112</a>
          </li>
          <li>
            Call Center BNPB: <a href="tel:117" className="font-bold text-primary">117</a>
          </li>
          <li>
            Ambulans: <a href="tel:119" className="font-bold text-primary">119</a>
          </li>
        </ul>
      </div>
    </div>
  );
}
