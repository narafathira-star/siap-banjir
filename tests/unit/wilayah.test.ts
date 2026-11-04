import type { TingkatWilayah } from "@prisma/client";
import { describe, expect, it } from "vitest";
import data112 from "@/data/layanan-112.json";
import { NOMOR_NASIONAL, SUMBER_NOMOR_NASIONAL } from "@/data/nomor-nasional";
import { ISI_PERSIAPAN_CATAT_NOMOR, isiPersiapanCatatNomor } from "@/lib/kontak-darurat";
import { kontakDaruratWilayah, namaInduk, namaTampilan, nomorDaruratWilayah, tokenPencarian } from "@/server/services/wilayah.service";

const w = (idWilayah: string, namaWilayah: string, level: TingkatWilayah) => ({ idWilayah, namaWilayah, level });

const tangerang = [
  w("36", "Banten", "PROVINSI"),
  w("36.71", "Kota Tangerang", "KABKOTA"),
  w("36.71.01", "Tangerang", "KECAMATAN"),
  w("36.71.01.1001", "Sukarasa", "DESA"),
];

const jakartaUtara = [
  w("31", "Daerah Khusus Ibukota Jakarta", "PROVINSI"),
  w("31.72", "Kota Administrasi Jakarta Utara", "KABKOTA"),
  w("31.72.01", "Penjaringan", "KECAMATAN"),
  w("31.72.01.1001", "Penjaringan", "DESA"),
];

describe("nama wilayah", () => {
  it("namaTampilan: jenis + desa/kelurahan, kab/kota", () => {
    expect(namaTampilan(tangerang)).toBe("Kelurahan Sukarasa, Kota Tangerang");
    const dayeuhkolot = [
      w("32", "Jawa Barat", "PROVINSI"),
      w("32.04", "Kabupaten Bandung", "KABKOTA"),
      w("32.04.12", "Dayeuhkolot", "KECAMATAN"),
      w("32.04.12.2004", "Cangkuang Kulon", "DESA"),
    ];
    expect(namaTampilan(dayeuhkolot)).toBe("Desa Cangkuang Kulon, Kabupaten Bandung");
  });

  it("namaInduk: kecamatan → kab/kota → provinsi", () => {
    expect(namaInduk(tangerang)).toBe("Kec. Tangerang, Kota Tangerang, Banten");
  });
});

describe("tokenPencarian", () => {
  it("huruf kecil, pisah tanda baca, buang token < 2 huruf, maks 5 kata", () => {
    expect(tokenPencarian("Sukarasa, TANGERANG")).toEqual(["sukarasa", "tangerang"]);
    expect(tokenPencarian("a b cd")).toEqual(["cd"]);
    expect(tokenPencarian("satu dua tiga empat lima enam")).toHaveLength(5);
    expect(tokenPencarian("%_'; --")).toEqual([]);
  });
});

describe("kontakDaruratWilayah", () => {
  it("nomor nasional + BPBD kab/kota dan provinsi; tanpa sumber resmi → nomor belum tersedia", () => {
    const kontak = kontakDaruratWilayah(tangerang);
    expect(kontak.map((k) => k.telepon)).toEqual(expect.arrayContaining(["112", "117"]));
    expect(kontak.slice(-2)).toEqual([
      { id: "bpbd-kabkota", nama: "BPBD Kota Tangerang", deskripsi: "Badan Penanggulangan Bencana Daerah", telepon: null },
      { id: "bpbd-provinsi", nama: "BPBD Provinsi Banten", deskripsi: "Badan Penanggulangan Bencana Daerah", telepon: null },
    ]);
  });

  it("112 diberi keterangan status layanan kab/kota beserta sumbernya", () => {
    const k112 = kontakDaruratWilayah(tangerang).find((k) => k.telepon === "112");
    expect(k112?.keterangan).toContain("Layanan 112 Kota Tangerang sudah diluncurkan");
    expect(k112?.sumber?.url).toBe("https://layanan112.komdigi.go.id/");
    expect(k112?.sumber?.keterangan).toMatch(/^data diambil \d+ \w+ \d{4}$/);
  });

  it("kota administrasi DKI Jakarta hanya memakai BPBD Provinsi", () => {
    const kontak = kontakDaruratWilayah(jakartaUtara);
    expect(kontak.filter((k) => k.nama.startsWith("BPBD"))).toMatchObject([
      { id: "bpbd-provinsi", nama: "BPBD Provinsi Daerah Khusus Ibukota Jakarta", telepon: null },
    ]);
  });

  it("BPBD Provinsi DIY memakai nomor terverifikasi beserta sumber dan tanggal pemeriksaan", () => {
    const sleman = [w("34", "Daerah Istimewa Yogyakarta", "PROVINSI"), w("34.04", "Kabupaten Sleman", "KABKOTA")];
    const [kab, prov] = kontakDaruratWilayah(sleman).slice(-2);
    expect(kab).toMatchObject({ nama: "BPBD Kabupaten Sleman", telepon: null });
    expect(prov).toMatchObject({
      nama: "BPBD Provinsi Daerah Istimewa Yogyakarta",
      telepon: "(0274) 555585",
      sumber: { url: "https://bpbd.jogjaprov.go.id/beranda", keterangan: "diperiksa 27 September 2026" },
    });
  });
});

describe("nomorDaruratWilayah (D-050, D-051)", () => {
  const diy = w("34", "Daerah Istimewa Yogyakarta", "PROVINSI");
  const id = (k: { id: string }) => k.id;
  const NASIONAL_LAIN = ["115", "117", "110", "119", "113"];
  const tanpa112TanpaBpbd = data112.daftar.find((e) => e.status !== 1 && !e.idWilayah.startsWith("34."))!;
  const wilayahTanpa112 = [
    w(tanpa112TanpaBpbd.idWilayah.slice(0, 2), "Provinsi X", "PROVINSI"),
    w(tanpa112TanpaBpbd.idWilayah, "Kab X", "KABKOTA"),
  ];

  it("112 sudah diluncurkan → 112 utama, lalu BPBD dan nomor nasional (115 lebih dulu); tanpa pendamping", () => {
    const n = nomorDaruratWilayah(tangerang);
    expect(n.utama.id).toBe("112");
    expect(n.utama.keterangan).toContain("sudah diluncurkan");
    expect(n.pendamping).toEqual([]);
    expect(n.lainnya.map(id)).toEqual(["bpbd-kabkota", "bpbd-provinsi", ...NASIONAL_LAIN]);
    expect(n.catatan112).toBeNull();
  });

  it("112 belum diluncurkan + BPBD bernomor → BPBD utama; 112 tetap di daftar, keterangannya jadi catatan", () => {
    const n = nomorDaruratWilayah([diy, w("34.01", "Kabupaten Kulon Progo", "KABKOTA")]);
    expect(n.utama).toMatchObject({ id: "bpbd-provinsi", telepon: "(0274) 555585" });
    expect(n.pendamping).toEqual([]);
    expect(n.lainnya.map(id)).toEqual(["112", "bpbd-kabkota", ...NASIONAL_LAIN]);
    expect(n.lainnya[0]!.keterangan).toBeUndefined();
    expect(n.lainnya[0]!.sumber?.url).toBe("https://layanan112.komdigi.go.id/");
    expect(n.catatan112?.judul).toBe("Layanan 112 Kabupaten Kulon Progo belum tercatat diluncurkan.");
    expect(n.catatan112?.isi).toContain("belum tercatat memiliki layanan 112");
    expect(n.catatan112?.isi).not.toMatch(/tidak (bisa|dapat) (dipakai|digunakan)/);
  });

  it("112 belum diluncurkan tanpa BPBD bernomor → 112 utama didampingi semua nomor nasional di atas", () => {
    const n = nomorDaruratWilayah(wilayahTanpa112);
    expect(n.utama.id).toBe("112");
    expect(n.pendamping.map(id)).toEqual(NASIONAL_LAIN);
    expect(n.lainnya.map(id)).toEqual(["bpbd-kabkota", "bpbd-provinsi"]);
    expect(n.catatan112?.isi).toContain(`berstatus "${tanpa112TanpaBpbd.statusLabel}"`);
  });

  it("tanpa wilayah → hanya nomor nasional, 112 utama", () => {
    const n = nomorDaruratWilayah([]);
    expect(n.utama.id).toBe("112");
    expect(n.pendamping).toEqual([]);
    expect(n.lainnya.map(id)).toEqual(NASIONAL_LAIN);
    expect(n.catatan112).toBeNull();
  });

  describe("isi butir Checklist Siaga 'Catat nomor darurat' (D-051)", () => {
    it("112 sudah diluncurkan atau tanpa wilayah → teks asli", () => {
      expect(isiPersiapanCatatNomor(nomorDaruratWilayah(tangerang))).toBe(ISI_PERSIAPAN_CATAT_NOMOR);
      expect(isiPersiapanCatatNomor(nomorDaruratWilayah([]))).toBe(ISI_PERSIAPAN_CATAT_NOMOR);
    });

    it("112 belum diluncurkan + BPBD bernomor → BPBD lebih dulu, 112 tetap disebut beserta statusnya", () => {
      expect(isiPersiapanCatatNomor(nomorDaruratWilayah([diy, w("34.01", "Kabupaten Kulon Progo", "KABKOTA")]))).toBe(
        "Catat nomor darurat di ponsel: BPBD Provinsi Daerah Istimewa Yogyakarta (0274) 555585, Basarnas 115, " +
          "Call Center BNPB 117, Kepolisian 110, Ambulans 119, Pemadam Kebakaran 113, " +
          "dan 112 (layanan 112 Kabupaten Kulon Progo belum tercatat diluncurkan).",
      );
    });

    it("112 belum diluncurkan tanpa BPBD bernomor → nomor nasional, BPBD tanpa nomor tidak disebut", () => {
      const isi = isiPersiapanCatatNomor(nomorDaruratWilayah(wilayahTanpa112));
      expect(isi).toBe(
        "Catat nomor darurat di ponsel: Basarnas 115, Call Center BNPB 117, Kepolisian 110, Ambulans 119, " +
          "Pemadam Kebakaran 113, dan 112 (layanan 112 Kab X belum tercatat diluncurkan).",
      );
    });
  });
});

describe("sumber nomor darurat nasional (D-051)", () => {
  it("setiap nomor nasional tercantum di minimal satu sumber resmi *.go.id yang bertanggal", () => {
    for (const k of NOMOR_NASIONAL) {
      expect(SUMBER_NOMOR_NASIONAL.some((s) => s.nomor.includes(k.telepon)), k.telepon).toBe(true);
    }
    for (const s of SUMBER_NOMOR_NASIONAL) {
      expect(new URL(s.url).protocol).toBe("https:");
      expect(new URL(s.url).hostname).toMatch(/(^|\.)go\.id$/);
      expect(s.diperiksaPada).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("Buku Saku hal. 82 → halaman PDF 84", () => {
    expect(SUMBER_NOMOR_NASIONAL[0]!.url).toMatch(/#page=84$/);
  });
});
