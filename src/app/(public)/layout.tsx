import { BottomNav } from "@/components/layout/bottom-nav";
import { DaftarServiceWorker } from "@/components/layout/daftar-service-worker";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { NotifikasiProvider } from "@/components/notifikasi/notifikasi-provider";
import { Toaster } from "@/components/ui/sonner";
import { SinkronWilayah } from "@/components/wilayah/sinkron-wilayah";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotifikasiProvider>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Lewati ke konten
        </a>
        <SiteHeader />
        <main id="konten" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-3 pb-6">
          {children}
        </main>
        {/* Ruang kosong agar footer tidak tertutup BottomNav di HP. */}
        <div className="pb-24 md:pb-0">
          <SiteFooter />
        </div>
        <BottomNav />
        <SinkronWilayah />
        <DaftarServiceWorker />
      </div>
      <Toaster />
    </NotifikasiProvider>
  );
}
