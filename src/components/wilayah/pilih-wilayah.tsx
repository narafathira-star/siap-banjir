"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, LocateFixed, Search } from "lucide-react";
import { useNotifikasi } from "@/components/notifikasi/notifikasi-provider";
import { useWilayah } from "@/hooks/useWilayah";
import { jenisWilayah } from "@/lib/kode-wilayah";
import { cn } from "@/lib/utils";
import type { DataPemilih, HasilPencarian, RingkasWilayah } from "@/server/services/wilayah.service";

type Tingkat = "provinsi" | "kabkota" | "kecamatan" | "desa";
const TINGKAT: { id: Tingkat; label: string; kosong: string }[] = [
  { id: "provinsi", label: "Provinsi", kosong: "Pilih provinsi…" },
  { id: "kabkota", label: "Kabupaten/Kota", kosong: "Pilih kabupaten/kota…" },
  { id: "kecamatan", label: "Kecamatan", kosong: "Pilih kecamatan…" },
  { id: "desa", label: "Desa/Kelurahan", kosong: "Pilih desa/kelurahan…" },
];

type StatusPesan = { tipe: "info" | "galat"; teks: string } | null;

async function ambilData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const pesan = json && typeof json === "object" && "error" in json && typeof json.error === "string" ? json.error : null;
    throw new Error(pesan ?? `HTTP ${res.status}`);
  }
  return (json as { data: T }).data;
}

/** Kolom isian & pilihan (board Pengaturan): 48 px, garis #9AA6B8, teks 16 px (tidak memicu zoom di iOS). */
const kelasSelect =
  "min-h-12 w-full rounded-xl border border-[#9aa6b8] bg-card px-3 text-[16px] text-foreground disabled:cursor-not-allowed disabled:opacity-50";

/** Kotak pencarian desa/kelurahan (pola combobox ARIA). */
function CariWilayah({ onPilih }: { onPilih: (hasil: HasilPencarian) => void }) {
  const id = useId();
  const [q, setQ] = useState("");
  const [hasil, setHasil] = useState<HasilPencarian[]>([]);
  const [aktif, setAktif] = useState(-1);
  const [terbuka, setTerbuka] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    const kueri = q.trim();
    if (kueri.length < 3) {
      setHasil([]);
      setGalat(null);
      return;
    }
    const kontrol = new AbortController();
    const timer = window.setTimeout(async () => {
      setMemuat(true);
      try {
        const res = await fetch(`/api/wilayah/cari?q=${encodeURIComponent(kueri)}`, { signal: kontrol.signal });
        if (!res.ok) throw new Error(res.status === 429 ? "Terlalu banyak pencarian. Tunggu sebentar." : "Pencarian gagal.");
        setHasil(((await res.json()) as { data: HasilPencarian[] }).data);
        setGalat(null);
        setAktif(-1);
        setTerbuka(true);
      } catch (err) {
        if (!kontrol.signal.aborted) setGalat(err instanceof Error ? err.message : "Pencarian gagal.");
      } finally {
        if (!kontrol.signal.aborted) setMemuat(false);
      }
    }, 300);
    return () => {
      kontrol.abort();
      window.clearTimeout(timer);
    };
  }, [q]);

  const pilih = (h: HasilPencarian) => {
    setTerbuka(false);
    setQ("");
    setHasil([]);
    onPilih(h);
  };

  const tampil = terbuka && q.trim().length >= 3;

  return (
    <div className="relative">
      <label htmlFor={`${id}-input`} className="mb-1.5 block text-[14px] font-bold">
        Cari desa/kelurahan
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        <input
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={tampil}
          aria-controls={`${id}-daftar`}
          aria-autocomplete="list"
          aria-activedescendant={aktif >= 0 ? `${id}-opsi-${aktif}` : undefined}
          aria-describedby={`${id}-bantuan`}
          autoComplete="off"
          placeholder="Contoh: Sukarasa Tangerang"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setTerbuka(true);
          }}
          onFocus={() => setTerbuka(true)}
          onBlur={() => window.setTimeout(() => setTerbuka(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setTerbuka(true);
              setAktif((a) => Math.min(a + 1, hasil.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAktif((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && aktif >= 0 && hasil[aktif]) {
              e.preventDefault();
              pilih(hasil[aktif]);
            } else if (e.key === "Escape") {
              setTerbuka(false);
            }
          }}
          className={cn(kelasSelect, "pr-10 pl-[42px] placeholder:text-[#5b6678]")}
        />
        {memuat ? (
          <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : null}
      </div>
      <p id={`${id}-bantuan`} className="mt-1.5 text-[13px] leading-[1.45] text-muted-foreground">
        Ketik minimal 3 huruf: nama desa/kelurahan, bisa ditambah nama kecamatan atau kota.
      </p>
      {tampil ? (
        <ul
          id={`${id}-daftar`}
          role="listbox"
          aria-label="Hasil pencarian"
          className="absolute z-30 mt-1 max-h-80 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg"
        >
          {galat ? (
            <li className="px-3 py-2 text-sm text-destructive">{galat}</li>
          ) : hasil.length === 0 && !memuat ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan.</li>
          ) : (
            hasil.map((h, i) => (
              <li
                key={h.idWilayah}
                id={`${id}-opsi-${i}`}
                role="option"
                aria-selected={i === aktif}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilih(h)}
                className={cn("cursor-pointer rounded-lg px-3 py-2", i === aktif ? "bg-[#e8eefd]" : "hover:bg-[#f1f5fe]")}
              >
                <span className="block font-medium">
                  {h.jenis} {h.namaWilayah}
                </span>
                <span className="block text-sm text-muted-foreground">{h.namaLengkap.split(", ").slice(1).join(", ")}</span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * aturLokasi(wilayah): pilih desa/kelurahan lewat pencarian, pilihan bertingkat
 * (Provinsi → Kab/Kota → Kecamatan → Desa/Kelurahan), atau lokasi GPS.
 */
export function PilihWilayah({
  data,
  namaTerpilih,
  tungguKonten = false,
}: {
  data: DataPemilih;
  namaTerpilih: string | null;
  /** Halaman menampilkan isi wilayah (dengan TandaKontenWilayah): tawarkan izin setelah isi tampil. */
  tungguKonten?: boolean;
}) {
  const { pilihWilayah: simpanPilihan } = useWilayah();
  const { setelahPilihWilayah } = useNotifikasi();
  const id = useId();
  const [pilihan, setPilihan] = useState(data.pilihan);
  const [daftar, setDaftar] = useState(data.daftar);
  // Wilayah terpilih berubah dari server (pencarian/GPS/tautan) → samakan pilihan bertingkat.
  // Tidak memakai `key` agar pesan (misal hasil GPS) tetap tampil setelah render ulang.
  const kunciData = Object.values(data.pilihan).join("|");
  const [kunciSebelum, setKunciSebelum] = useState(kunciData);
  if (kunciData !== kunciSebelum) {
    setKunciSebelum(kunciData);
    setPilihan(data.pilihan);
    setDaftar(data.daftar);
  }
  const [memuat, setMemuat] = useState<Tingkat | null>(null);
  const [pesan, setPesan] = useState<StatusPesan>(null);
  const [gps, setGps] = useState(false);
  const permintaan = useRef(0);

  // aturLokasi(wilayah) → simpan preferensi → popup izin notifikasi / sinkron langganan.
  function pilihDesa(idWilayah: string, namaWilayah: string) {
    simpanPilihan(idWilayah);
    setelahPilihWilayah({ idWilayah, namaWilayah }, { tungguKonten });
  }

  async function ubah(tingkat: Tingkat, kode: string) {
    const i = TINGKAT.findIndex((t) => t.id === tingkat);
    const berikut = TINGKAT[i + 1]?.id;
    const baru = { ...pilihan, [tingkat]: kode || null };
    for (const t of TINGKAT.slice(i + 1)) baru[t.id] = null;
    setPilihan(baru);
    setPesan(null);

    if (tingkat === "desa") {
      const desa = daftar.desa.find((d) => d.idWilayah === kode);
      const kab = daftar.kabkota.find((k) => k.idWilayah === baru.kabkota);
      if (desa) pilihDesa(desa.idWilayah, `${jenisWilayah(desa.idWilayah)} ${desa.namaWilayah}${kab ? `, ${kab.namaWilayah}` : ""}`);
      return;
    }
    if (!berikut) return;

    const kosongkan = Object.fromEntries(TINGKAT.slice(i + 1).map((t) => [t.id, [] as RingkasWilayah[]]));
    setDaftar((d) => ({ ...d, ...kosongkan }));
    if (!kode) return;

    const nomor = ++permintaan.current;
    setMemuat(berikut);
    try {
      const anak = await ambilData<RingkasWilayah[]>(`/api/wilayah?induk=${encodeURIComponent(kode)}`);
      if (nomor === permintaan.current) setDaftar((d) => ({ ...d, [berikut]: anak }));
    } catch {
      if (nomor === permintaan.current) setPesan({ tipe: "galat", teks: "Gagal memuat daftar wilayah. Coba lagi." });
    } finally {
      if (nomor === permintaan.current) setMemuat(null);
    }
  }

  function pakaiLokasi() {
    if (!("geolocation" in navigator)) {
      setPesan({ tipe: "galat", teks: "Browser ini tidak mendukung lokasi GPS. Pilih wilayah dari daftar." });
      return;
    }
    setGps(true);
    setPesan(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const hasil = await ambilData<{ idWilayah: string; namaWilayah: string; jarakKm: number }>(
            `/api/wilayah/terdekat?lat=${coords.latitude}&lng=${coords.longitude}`,
          );
          setPesan({
            tipe: "info",
            teks: `Desa/kelurahan terdekat: ${hasil.namaWilayah} (±${hasil.jarakKm.toLocaleString("id-ID")} km dari titik pusatnya). Bukan wilayah Anda? Pilih dari daftar.`,
          });
          pilihDesa(hasil.idWilayah, hasil.namaWilayah);
        } catch (err) {
          setPesan({ tipe: "galat", teks: err instanceof Error ? err.message : "Lokasi tidak dapat diproses." });
        } finally {
          setGps(false);
        }
      },
      (err) => {
        setGps(false);
        setPesan({
          tipe: "galat",
          teks:
            err.code === err.PERMISSION_DENIED
              ? "Izin lokasi ditolak. Pilih wilayah dari daftar."
              : "Lokasi tidak dapat ditemukan. Pilih wilayah dari daftar.",
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10 * 60 * 1000 },
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {namaTerpilih ? (
        <p className="flex flex-col gap-0.5 rounded-[14px] bg-[#e8eefd] px-3.5 py-3">
          <span className="text-[12px] font-semibold text-[#3e4a5c]">Wilayah yang dipantau</span>
          <span className="text-[16px] font-extrabold">{namaTerpilih}</span>
        </p>
      ) : null}

      <CariWilayah onPilih={(h) => pilihDesa(h.idWilayah, `${h.jenis} ${h.namaWilayah}, ${h.namaLengkap.split(", ").at(-2) ?? ""}`)} />

      <button
        type="button"
        onClick={pakaiLokasi}
        disabled={gps}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary bg-card text-[15px] font-bold text-primary transition-colors hover:bg-[#f1f5fe] disabled:opacity-60"
      >
        {gps ? (
          <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="size-[18px]" strokeWidth={2.2} aria-hidden="true" />
        )}
        Gunakan lokasi saya
      </button>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3.5 flex w-full items-center gap-2.5 text-[13px] font-semibold text-muted-foreground">
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
          atau pilih bertingkat
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </legend>
        <div className="flex flex-col gap-3">
          {TINGKAT.map(({ id: t, label, kosong }, i) => {
            const opsi = daftar[t];
            const indukKosong = i > 0 && !pilihan[TINGKAT[i - 1]!.id];
            return (
              <div key={t} className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-${t}`} className="flex items-center gap-2 text-[14px] font-bold">
                  {label}
                  {memuat === t ? <LoaderCircle className="size-3.5 animate-spin" aria-label="Memuat" /> : null}
                </label>
                <select
                  id={`${id}-${t}`}
                  value={pilihan[t] ?? ""}
                  onChange={(e) => void ubah(t, e.target.value)}
                  disabled={indukKosong || memuat === t}
                  className={kelasSelect}
                >
                  <option value="" disabled={t === "desa"}>
                    {kosong}
                  </option>
                  {opsi.map((w) => (
                    <option key={w.idWilayah} value={w.idWilayah}>
                      {t === "desa" ? `${jenisWilayah(w.idWilayah)} ${w.namaWilayah}` : w.namaWilayah}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </fieldset>

      <p aria-live="polite" className={cn("text-[14px] leading-normal empty:hidden", pesan?.tipe === "galat" ? "text-destructive" : "text-[#3e4a5c]")}>
        {pesan?.teks}
      </p>
    </div>
  );
}
