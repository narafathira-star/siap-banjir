import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchX className="size-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground">Halaman yang Anda cari tidak ada atau sudah dipindahkan.</p>
      <Button asChild size="lg">
        <Link href="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}
