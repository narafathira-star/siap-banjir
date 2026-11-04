"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { sudahDitanya, tandaiSudahDitanya } from "@/lib/push-client";
import { DialogIzinNotifikasi } from "./dialog-izin-notifikasi";

type WilayahDialog = { idWilayah: string; namaWilayah: string };

type NilaiKonteks = ReturnType<typeof usePushSubscription> & {
  /** Buka dialog izin kustom (sebelum izin browser). */
  bukaDialogIzin: (wilayah: WilayahDialog) => void;
  /**
   * Dipanggil setelah aturLokasi(wilayah): tawarkan izin atau sinkronkan wilayah langganan.
   * `tungguKonten`: buka dialog izin setelah isi halaman untuk wilayah itu tampil (D-049).
   */
  setelahPilihWilayah: (wilayah: WilayahDialog, opsi?: { tungguKonten?: boolean }) => void;
  /** Dipanggil TandaKontenWilayah: isi halaman untuk wilayah ini sudah tampil / sudah dilepas. */
  kontenTampil: (idWilayah: string | null) => void;
};

const Konteks = createContext<NilaiKonteks | null>(null);

export function useNotifikasi() {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error("useNotifikasi harus dipakai di dalam NotifikasiProvider");
  return nilai;
}

export function pesanGalat(err: unknown) {
  return err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.";
}

export function NotifikasiProvider({ children }: { children: React.ReactNode }) {
  const push = usePushSubscription();
  const [dialog, setDialog] = useState<WilayahDialog | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const { status, perbarui, aktifkan } = push;

  const bukaDialogIzin = useCallback((wilayah: WilayahDialog) => setDialog(wilayah), []);

  // Wilayah yang isinya sedang tampil di halaman (dilaporkan TandaKontenWilayah).
  const [konten, setKonten] = useState<string | null>(null);
  const kontenTampil = useCallback((idWilayah: string | null) => setKonten(idWilayah), []);

  // Tindak lanjut pilihan wilayah, diproses setelah status push diketahui dan (jika diminta)
  // isi halaman untuk wilayah itu tampil. Dialog izin tidak menutupi halaman yang masih memuat.
  const [tertunda, setTertunda] = useState<{ wilayah: WilayahDialog; tungguKonten: boolean } | null>(null);

  const setelahPilihWilayah = useCallback(
    (wilayah: WilayahDialog, opsi?: { tungguKonten?: boolean }) =>
      setTertunda({ wilayah, tungguKonten: opsi?.tungguKonten ?? false }),
    [],
  );

  useEffect(() => {
    if (!tertunda || status === "memuat") return;
    const { wilayah, tungguKonten } = tertunda;
    if (status === "aktif") {
      setTertunda(null);
      perbarui({ idWilayah: wilayah.idWilayah })
        .then(() => toast.success(`Peringatan kini untuk ${wilayah.namaWilayah}.`))
        .catch((err: unknown) => toast.error(pesanGalat(err)));
      return;
    }
    if (status === "belum-aktif" && !sudahDitanya()) {
      if (tungguKonten && konten !== wilayah.idWilayah) return;
      setDialog(wilayah);
    }
    setTertunda(null);
  }, [tertunda, status, konten, perbarui]);

  // [izin notifikasi] → daftarkanPerangkat() → aktifkan(); [else] → lanjut tanpa notifikasi.
  const izinkan = useCallback(async () => {
    if (!dialog) return;
    setSibuk(true);
    tandaiSudahDitanya();
    try {
      const berhasil = await aktifkan(dialog.idWilayah);
      if (berhasil) toast.success(`Peringatan aktif untuk ${dialog.namaWilayah}.`);
      else toast.info("Izin notifikasi tidak diberikan. Anda tetap bisa memantau risiko di aplikasi.");
      setDialog(null);
    } catch (err) {
      toast.error(pesanGalat(err));
    } finally {
      setSibuk(false);
    }
  }, [aktifkan, dialog]);

  const nantiSaja = useCallback(() => {
    tandaiSudahDitanya();
    setDialog(null);
  }, []);

  return (
    <Konteks.Provider value={{ ...push, bukaDialogIzin, setelahPilihWilayah, kontenTampil }}>
      {children}
      <DialogIzinNotifikasi
        terbuka={dialog !== null}
        namaWilayah={dialog?.namaWilayah ?? ""}
        ditolak={status === "ditolak"}
        tidakDidukung={status === "tidak-didukung" || status === "belum-dikonfigurasi"}
        sibuk={sibuk}
        onIzinkan={izinkan}
        onNanti={nantiSaja}
      />
    </Konteks.Provider>
  );
}
