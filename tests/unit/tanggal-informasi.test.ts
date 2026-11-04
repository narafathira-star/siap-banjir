import { describe, expect, it } from "vitest";
import { teksTanggalInformasi } from "@/lib/tanggal-informasi";

// D-061: tanggal riwayat = tanggal di lokasi kejadian. Fungsi ini tidak menerima wilayah pengguna sama sekali.
describe("tanggal riwayat di zona lokasi kejadian, dekat tengah malam", () => {
  it("Kota Ternate (WIT): 25 Sep 15:30 UTC = 26 Sep 00:30 WIT, walau di WIB masih 25 Sep 22:30", () => {
    const tanggal = new Date("2026-09-25T15:30:00Z");
    expect(teksTanggalInformasi({ tanggal, idWilayah: "82.71" })).toBe("26 Sep 2026");
    expect(teksTanggalInformasi({ tanggal, idWilayah: "82.71", panjang: true })).toBe("Sabtu, 26 September 2026");
  });

  it("Kota Denpasar (WITA): 16:30 UTC = 26 Sep 00:30 WITA", () => {
    expect(teksTanggalInformasi({ tanggal: new Date("2026-09-25T16:30:00Z"), idWilayah: "51.71" })).toBe("26 Sep 2026");
  });

  it("Kota Semarang (WIB): 16:59 UTC = 25 Sep 23:59 WIB, meski di WITA/WIT sudah 26 Sep", () => {
    expect(teksTanggalInformasi({ tanggal: new Date("2026-09-25T16:59:00Z"), idWilayah: "33.74" })).toBe("25 Sep 2026");
  });

  it("tanggal seed (tanpa jam) tetap tanggal yang sama di zona mana pun: Sitaro 5 Januari 2026", () => {
    const tanggal = new Date("2026-01-05"); // disimpan sebagai 00:00 UTC
    expect(teksTanggalInformasi({ tanggal, idWilayah: "71.09", panjang: true })).toBe("Senin, 5 Januari 2026");
    expect(teksTanggalInformasi({ tanggal, idWilayah: "95.08" })).toBe("5 Jan 2026");
    expect(teksTanggalInformasi({ tanggal, idWilayah: "33" })).toBe("5 Jan 2026");
  });
});
