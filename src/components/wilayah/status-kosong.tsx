import { CloudOff, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function BelumPilihWilayah() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
        <MapPin className="size-10 text-primary" aria-hidden="true" />
        <p className="text-lg font-semibold">Pilih wilayah terlebih dulu</p>
        <p className="max-w-sm text-muted-foreground">
          Cari atau pilih desa/kelurahan Anda, atau gunakan lokasi Anda, untuk melihat cuaca dan level risiko banjir.
        </p>
      </CardContent>
    </Card>
  );
}

export function DataCuacaTidakTersedia() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
        <CloudOff className="size-10 text-muted-foreground" aria-hidden="true" />
        <p className="text-lg font-semibold">Data cuaca belum tersedia</p>
        <p className="max-w-sm text-muted-foreground">
          Open-Meteo sedang tidak dapat dihubungi dan belum ada data tersimpan untuk wilayah ini. Coba muat ulang
          beberapa saat lagi.
        </p>
      </CardContent>
    </Card>
  );
}
