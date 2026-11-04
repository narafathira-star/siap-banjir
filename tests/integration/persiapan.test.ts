/**
 * Butir Checklist Siaga "Catat nomor darurat 112 …" menyesuaikan status layanan 112 (D-051).
 * Jalankan: npm run test:integration (butuh PostgreSQL + migrasi + seed).
 */
import { describe, expect, it } from "vitest";
import { ISI_PERSIAPAN_CATAT_NOMOR } from "@/lib/kontak-darurat";
import { lihatPersiapanWilayah } from "@/server/services/pemantauan.service";

const butirCatat = async (idWilayah: string) =>
  (await lihatPersiapanWilayah("RENDAH", idWilayah)).find((p) => p.isiPersiapan.startsWith("Catat nomor darurat"))?.isiPersiapan;

describe("lihatPersiapanWilayah", () => {
  it("112 sudah diluncurkan (Kota Semarang) → teks asli", async () => {
    expect(await butirCatat("33.74.02.1002")).toBe(ISI_PERSIAPAN_CATAT_NOMOR);
  });

  it("112 belum tercatat (Kulon Progo) → BPBD Provinsi DIY lebih dulu, 112 tetap disebut", async () => {
    const isi = await butirCatat("34.01.01.2001");
    expect(isi).toMatch(/^Catat nomor darurat di ponsel: BPBD Provinsi Daerah Istimewa Yogyakarta \(0274\) 555585, Basarnas 115,/);
    expect(isi).toContain("dan 112 (layanan 112 Kabupaten Kulon Progo belum tercatat diluncurkan).");
  });

  it("112 uji coba tanpa BPBD bernomor (Nias) → nomor nasional", async () => {
    expect(await butirCatat("12.04.05.2001")).toBe(
      "Catat nomor darurat di ponsel: Basarnas 115, Call Center BNPB 117, Kepolisian 110, Ambulans 119, " +
        "Pemadam Kebakaran 113, dan 112 (layanan 112 Kabupaten Nias belum tercatat diluncurkan).",
    );
  });

  it("butir lain dan urutannya tidak berubah", async () => {
    const asli = (await lihatPersiapanWilayah("RENDAH", "33.74.02.1002")).map((p) => p.idPersiapan);
    expect((await lihatPersiapanWilayah("RENDAH", "12.04.05.2001")).map((p) => p.idPersiapan)).toEqual(asli);
  });
});
