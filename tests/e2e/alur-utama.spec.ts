import { expect, test, type Page } from "@playwright/test";
import {
  DESA_TANPA_112,
  DESA_TANPA_112_TANPA_BPBD,
  DESA_UJI,
  buatRiwayatUji,
  dataCuacaTerbaru,
  identitasUji,
  jamDiZona,
  jamWib,
  stubPush,
  tuakanDataCuaca,
  WILAYAH_SIMULASI,
} from "./bantuan";

test.beforeEach(async ({ context, page }, testInfo) => {
  await context.grantPermissions(["notifications", "geolocation"]);
  await stubPush(page, testInfo);
});

test("alur utama: pilih wilayah → lihat risiko → aktifkan notifikasi → atur notifikasi", async ({
  page,
  request,
}, testInfo) => {
  const { endpoint } = identitasUji(testInfo);
  const statusLangganan = async () => {
    const res = await request.get(`/api/push/langganan?endpoint=${encodeURIComponent(endpoint)}`);
    return res.ok() ? ((await res.json()) as { data: { status: boolean; levelMinimum: string; idWilayah: string } }).data : null;
  };

  await test.step("Beranda tanpa wilayah meminta pengguna memilih wilayah", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Siap Banjir: Beranda", level: 1 })).toBeAttached();
    await expect(page.getByText("Pilih wilayah terlebih dulu")).toBeVisible();
  });

  await test.step("aturLokasi(wilayah) lewat pencarian → dialog izin notifikasi muncul", async () => {
    await page.getByRole("combobox", { name: "Cari desa/kelurahan" }).fill("bulu lor semarang");
    await page.getByRole("option", { name: /Kelurahan Bulu Lor/ }).click();
    await expect(page).toHaveURL(new RegExp(`wilayah=${DESA_UJI.replaceAll(".", "\\.")}`));
    await expect(page.getByRole("dialog", { name: "Aktifkan peringatan banjir?" })).toBeVisible();
  });

  await test.step("[izin notifikasi] → daftarkanPerangkat() → aktifkan() → status aktif", async () => {
    await page.getByRole("button", { name: "Izinkan notifikasi" }).click();
    await expect(page.getByText("Peringatan aktif untuk Kelurahan Bulu Lor, Kota Semarang.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Peringatan dini\s*Aktif\s*Level Sedang & Tinggi/ })).toBeVisible();
    expect(await statusLangganan()).toMatchObject({ status: true, idWilayah: DESA_UJI, levelMinimum: "SEDANG" });
  });

  await test.step("Beranda menampilkan wilayah terpilih, level risiko, ilustrasi, cuaca, dan kontak", async () => {
    await expect(page.getByRole("link", { name: /Wilayah yang dipantau\s*Kelurahan Bulu Lor, Kota Semarang/ })).toHaveAttribute(
      "href",
      "/pengaturan",
    );
    await expect(page.getByText(/^Risiko (Rendah|Sedang|Tinggi)$/).first()).toBeVisible();
    await expect(page.getByRole("img", { name: /Ilustrasi 3D: air naik sampai tanda level (Rendah|Sedang|Tinggi)/ })).toBeVisible();
    await expect(page.getByRole("list", { name: "Skala level risiko" }).locator('[aria-current="step"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Cuaca terkini/ })).toContainText(/Hujan 24 jam: [\d,]+ mm/);
    await expect(page.getByRole("link", { name: /Kontak darurat/ })).toHaveAttribute("href", `/kontak?wilayah=${DESA_UJI}`);
    await expect(page.getByRole("banner").getByRole("link", { name: "Darurat" })).toHaveAttribute("href", "/kontak");
    await expect(page.getByText("Data cuaca: Open-Meteo.com").first()).toBeVisible();
  });

  await test.step("Detail risiko: skor, arti level, penanganan, checklist tersimpan", async () => {
    // Teks tombol mengikuti level (rendah/sedang/tinggi).
    await page.getByRole("link", { name: /^Lihat (persiapan & rekomendasi|langkah siaga|langkah penyelamatan)$/ }).click();
    await expect(page).toHaveURL(new RegExp(`/risiko\\?wilayah=${DESA_UJI.replaceAll(".", "\\.")}`));
    const konten = page.locator("#konten");
    await expect(konten.getByRole("heading", { name: "Risiko Banjir", level: 1 })).toBeVisible();
    await expect(konten.getByText("Kelurahan Bulu Lor, Kota Semarang", { exact: true })).toBeVisible();
    await expect(konten.getByRole("link", { name: "Ubah wilayah" })).toHaveAttribute("href", "/pengaturan");
    await expect(page.getByRole("img", { name: /Skor risiko \d+ dari 100/ })).toBeVisible();
    await expect(page.getByText(/bukan peringatan resmi/).first()).toBeVisible();
    await expect(page.getByText("Ada parameter yang melewati ambang Tinggi. Ikuti arahan evakuasi.")).toBeVisible();

    await expect(page.getByRole("tab", { name: "Checklist Siaga" })).toHaveAttribute("aria-selected", "true");
    const pertama = page.getByRole("tabpanel").getByRole("checkbox").first();
    await pertama.check();
    await expect(pertama).toBeChecked();
    await page.reload();
    await expect(page.getByRole("tabpanel").getByRole("checkbox").first()).toBeChecked();

    await page.getByRole("tab", { name: "Detail Mitigasi" }).click();
    await expect(page.getByRole("tabpanel").getByRole("listitem").first()).toBeVisible();
    // Kartu merah ke halaman Nomor Darurat (board Risiko, D-050).
    await expect(page.getByRole("link", { name: /Lihat nomor darurat\s*Untuk Kelurahan Bulu Lor, Kota Semarang/ })).toHaveAttribute(
      "href",
      `/kontak?wilayah=${DESA_UJI}`,
    );
  });

  await test.step("Pengaturan: level minimum & nonaktifkan notifikasi", async () => {
    await page.goto("/pengaturan");
    await expect(page.getByRole("heading", { name: "Pengaturan", level: 1 })).toBeVisible();
    const sakelar = page.getByRole("switch", { name: "Peringatan banjir" });
    await expect(sakelar).toBeChecked();
    // D-054: status di bawah label sakelar mengikuti board.
    await expect(sakelar).toHaveAccessibleDescription("Aktif. Anda akan menerima peringatan di perangkat ini.");
    await expect(page.getByRole("radio", { name: /^Sedang dan Tinggi: Peringatan lebih awal/ })).toBeChecked();

    await page.getByRole("radio", { name: /Hanya Tinggi/ }).click();
    await expect(page.getByText("Level minimum disimpan.", { exact: true })).toBeVisible();
    expect(await statusLangganan()).toMatchObject({ levelMinimum: "TINGGI", status: true });

    await sakelar.click();
    await expect(page.getByText("Notifikasi dinonaktifkan.", { exact: true })).toBeVisible();
    await expect(sakelar).not.toBeChecked();
    await expect(sakelar).toHaveAccessibleDescription("Nonaktif. Anda tidak akan menerima peringatan.");
    await expect(page.getByRole("radio", { name: /^Hanya Tinggi/ })).toBeDisabled();
    expect(await statusLangganan()).toMatchObject({ status: false });
  });
});

test("Gunakan lokasi saya memilih desa/kelurahan terdekat", async ({ page, context }) => {
  await context.setGeolocation({ latitude: -6.98, longitude: 110.41 }); // Semarang
  await page.goto("/cuaca");
  await page.getByRole("button", { name: "Gunakan lokasi saya" }).click();
  await expect(page).toHaveURL(/wilayah=33\.74\.\d{2}\.\d{4}/);
  // Dibatasi ke konten utama: dialog izin notifikasi juga menyebut nama wilayah.
  await expect(page.locator("#konten").getByText(/^(Kelurahan|Desa) .+, Kota Semarang$/)).toBeVisible();
  // D-049: dialog izin baru dibuka setelah isi wilayah tampil, jadi prakiraan sudah ada saat dialog muncul.
  const dialog = page.getByRole("dialog", { name: "Aktifkan peringatan banjir?" });
  await expect(dialog).toBeVisible();
  expect(await page.locator("#judul-harian").count()).toBe(1);
  await dialog.getByRole("button", { name: "Nanti saja" }).click();
  await expect(page.getByRole("heading", { name: "Prakiraan harian" })).toBeVisible();
  // Setelah wilayah terpilih, halaman Cuaca tidak lagi menampilkan pemilih (board Cuaca, D-052).
  await expect(page.getByRole("button", { name: "Gunakan lokasi saya" })).toHaveCount(0);
});

test("Pengaturan: pesan hasil GPS dan pilihan bertingkat tetap tampil setelah render ulang", async ({ page, context }) => {
  await context.setGeolocation({ latitude: -6.98, longitude: 110.41 }); // Semarang
  await page.goto("/pengaturan");
  await page.getByRole("button", { name: "Gunakan lokasi saya" }).click();
  await expect(page).toHaveURL(/wilayah=33\.74\.\d{2}\.\d{4}/);
  await expect(page.getByText(/Desa\/kelurahan terdekat: (Kelurahan|Desa) .+, Kota Semarang \(±/)).toBeVisible();
  await expect(page.getByLabel("Kabupaten/Kota", { exact: true })).toHaveValue("33.74");
});

test("pilih bertingkat Provinsi → Kab/Kota → Kecamatan → Desa/Kelurahan", async ({ page }) => {
  await page.goto("/pengaturan");
  const pilih = async (label: string, opsi: string) => {
    const select = page.getByLabel(label, { exact: true });
    await expect(select).toBeEnabled();
    await expect(select.locator("option", { hasText: opsi })).toHaveCount(1);
    await select.selectOption({ label: opsi });
  };
  await pilih("Provinsi", "Jawa Tengah");
  await pilih("Kabupaten/Kota", "Kota Semarang");
  await pilih("Kecamatan", "Semarang Utara");
  await pilih("Desa/Kelurahan", "Kelurahan Bulu Lor");
  await expect(page).toHaveURL(new RegExp(`wilayah=${DESA_UJI.replaceAll(".", "\\.")}`));
  await expect(page.locator("#konten").getByText("Kelurahan Bulu Lor, Kota Semarang", { exact: true })).toBeVisible();
  // Setelah render ulang, pilihan bertingkat tetap terisi sesuai wilayah terpilih.
  await expect(page.getByLabel("Kecamatan", { exact: true })).toHaveValue("33.74.02");
});

test("halaman Cuaca: cuaca terkini, prakiraan harian, dan curah hujan per jam", async ({ page }) => {
  await page.goto(`/cuaca?wilayah=${DESA_UJI}`);
  const konten = page.locator("#konten");
  await expect(konten.getByRole("heading", { name: "Prakiraan Cuaca", level: 1 })).toBeVisible();
  await expect(konten.getByText("Kelurahan Bulu Lor, Kota Semarang", { exact: true })).toBeVisible();
  await expect(konten.getByRole("link", { name: "Ubah wilayah" })).toHaveAttribute("href", "/pengaturan");

  const kini = konten.getByRole("region", { name: "Cuaca terkini" });
  await expect(kini.getByText(/^-?[\d,]+°C$/)).toBeVisible();
  for (const label of ["Kelembapan", "Angin", "Hujan 15 mnt"]) await expect(kini.getByText(label, { exact: true })).toBeVisible();
  await expect(kini.getByText(/^Diperbarui \d{2}:\d{2} WIB · Data cuaca berlaku untuk area ±11 km/)).toBeVisible();
  await expect(kini.getByRole("link", { name: "Open-Meteo.com" })).toHaveAttribute("href", "https://open-meteo.com/");

  const harian = konten.getByRole("region", { name: "Prakiraan harian" }).getByRole("listitem");
  await expect(harian).toHaveCount(3);
  await expect(harian.first().getByRole("heading", { name: "Hari ini" })).toBeVisible();
  await expect(harian.first()).toContainText(/Curah hujan[\d,]+ mmPeluang hujan\d+%Suhu[\d,]+–[\d,]+°C/);

  // D-052: grafik Recharts satu hari; pilihan hari lewat tab, hari ini bawaan.
  const jam = konten.getByRole("region", { name: "Prakiraan per jam" });
  const tabHariIni = jam.getByRole("tab", { name: /^Hari ini/ });
  await expect(tabHariIni).toHaveAttribute("aria-selected", "true");
  await expect(jam.locator(".recharts-surface")).toBeVisible();
  await expect(jam.locator(".recharts-xAxis .recharts-cartesian-axis-tick")).toHaveCount(8);
  // Keyboard: panah kanan pindah ke Besok.
  await tabHariIni.focus();
  await page.keyboard.press("ArrowRight");
  const tabBesok = jam.getByRole("tab", { name: /^Besok/ });
  await expect(tabBesok).toHaveAttribute("aria-selected", "true");
  await expect(tabBesok).toBeFocused();
  // Nilai per jam muncul saat grafik disentuh/diarahkan.
  await jam.locator(".recharts-surface").hover({ position: { x: 150, y: 120 } });
  await expect(jam.getByText(/^Pukul \d{2}:00 WIB$/)).toBeVisible();
  await expect(jam.getByText(/^Peluang hujan: /)).toBeVisible();
  // Tabel per jam untuk pembaca layar & keyboard: 24 baris, tanpa tanda "sudah lewat" di Besok.
  await jam.getByText("Lihat tabel per jam").click();
  const baris = jam.getByRole("table").getByRole("row");
  await expect(baris).toHaveCount(25);
  await expect(jam.getByRole("table")).not.toContainText("sudah lewat");
  await expect(page.getByRole("combobox", { name: "Cari desa/kelurahan" })).toHaveCount(0);
});

test("Beranda: jam pembaruan adalah tombol Perbarui yang menerapkan data baru (D-055)", async ({ page }) => {
  await page.goto(`/?wilayah=${DESA_UJI}`);
  const tombol = page.getByRole("button", { name: /^Perbarui data\. Terakhir diperbarui pukul \d{2}:\d{2} WIB$/ });
  await expect(tombol).toBeVisible();

  // Respons API ditahan (indikator memuat terlihat), lalu diubah agar pembaruan terbukti diterapkan.
  let lepas: () => void = () => {};
  const tahan = new Promise<void>((r) => (lepas = r));
  await page.route("**/api/risiko?*", async (route) => {
    await tahan;
    const res = await route.fetch();
    const json = (await res.json()) as { data: Record<string, unknown> };
    json.data.deskripsi = "UJI: deskripsi terbaru dari API.";
    json.data.waktuAmbilData = "2026-01-01T05:07:00.000Z"; // 12:07 WIB
    await route.fulfill({ response: res, json });
  });
  await tombol.click();
  const memuat = page.getByRole("button", { name: /^Memperbarui data\. Terakhir diperbarui pukul \d{2}:\d{2} WIB$/ });
  await expect(memuat).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("status").filter({ hasText: "Memperbarui data…" })).toBeAttached();
  lepas();
  await expect(page.getByRole("heading", { name: "UJI: deskripsi terbaru dari API." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Perbarui data. Terakhir diperbarui pukul 12:07 WIB" })).toHaveAttribute(
    "aria-disabled",
    "false",
  );
  // D-057: jam data tiruan (12:07) tidak lebih baru dari data sebelumnya → hasil cek, bukan "Data diperbarui".
  await expect(page.getByRole("status").filter({ hasText: "Sudah dicek" })).toHaveText(
    /^Sudah dicek \d{2}:\d{2} WIB · data terbaru dari 12:07 WIB\./,
  );
  await page.unroute("**/api/risiko?*");

  // Gagal: pesan sama dengan Risiko, data terakhir tetap tampil.
  await page.route("**/api/risiko?*", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Data cuaca belum tersedia" }) }),
  );
  await page.getByRole("button", { name: /^Perbarui data\./ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Gagal memperbarui" })).toHaveText(
    "Gagal memperbarui: Data cuaca belum tersedia. Menampilkan data terakhir.",
  );
  await expect(page.getByRole("heading", { name: "UJI: deskripsi terbaru dari API." })).toBeVisible();
});

const HALAMAN_TOMBOL_PERBARUI = [
  {
    nama: "Beranda",
    url: `/?wilayah=${DESA_UJI}`,
    tombol: (page: Page) => page.getByRole("button", { name: /^Perbarui data\./ }),
    jamData: (page: Page, jam: string) =>
      page.getByRole("button", { name: `Perbarui data. Terakhir diperbarui pukul ${jam} WIB` }),
  },
  {
    nama: "Risiko",
    url: `/risiko?wilayah=${DESA_UJI}`,
    tombol: (page: Page) => page.getByRole("button", { name: "Perbarui", exact: true }),
    // Dibatasi ke #konten: salinan HTML streaming Next yang tersembunyi bisa memuat teks yang sama.
    jamData: (page: Page, jam: string) => page.locator("#konten").getByText(new RegExp(`^Diperbarui ${jam} WIB ·`)),
  },
];

for (const h of HALAMAN_TOMBOL_PERBARUI) {
  test(`${h.nama}: tombol Perbarui mengambil data Open-Meteo baru bila data ≥ 15 menit (D-057)`, async ({ page }) => {
    await page.goto(h.url);
    await expect(h.tombol(page)).toBeVisible();

    // Data sel grid diambil 20 menit lalu: kunjungan biasa masih memakai cache 30 menit.
    const { waktu, jumlahData } = await tuakanDataCuaca(DESA_UJI, 20);
    const jamLama = jamWib(waktu);
    const jumlahAwal = await jumlahData();
    await page.reload();
    await expect(h.jamData(page, jamLama)).toBeVisible();

    // Tombol: data ≥ 15 menit → satu panggilan Open-Meteo, jam berubah.
    await h.tombol(page).click();
    const hasil = page.getByRole("status").filter({ hasText: /^Data diperbarui pukul/ });
    await expect(hasil).toHaveText(/^Data diperbarui pukul \d{2}:\d{2} WIB\.$/);
    const jamBaru = /(\d{2}:\d{2})/.exec((await hasil.textContent()) ?? "")?.[1] ?? "";
    expect(jamBaru).not.toBe(jamLama);
    await expect(h.jamData(page, jamBaru)).toBeVisible();
    expect(await jumlahData()).toBe(jumlahAwal + 1);

    // Ditekan lagi (< 15 menit): tidak memanggil Open-Meteo, umpan balik menjelaskan kenapa jam tetap.
    // Jam cek = jam browser; dikunci agar versi singkat/lengkap pasti (D-062).
    const { waktuAmbil } = await dataCuacaTerbaru(DESA_UJI);
    const jamBerikutnya = jamWib(new Date(waktuAmbil.getTime() + 15 * 60_000));
    // Menit yang sama dengan jam data → versi singkat.
    await page.clock.setFixedTime(waktuAmbil);
    await h.tombol(page).click();
    await expect(page.getByRole("status").filter({ hasText: "Data sudah terbaru" })).toHaveText(
      `Data sudah terbaru (${jamBaru} WIB). Bisa diperbarui lagi pukul ${jamBerikutnya} WIB.`,
    );
    // Dua menit kemudian → versi lengkap; setiap jam tetap dengan zona.
    const duaMenit = new Date(waktuAmbil.getTime() + 2 * 60_000);
    await page.clock.setFixedTime(duaMenit);
    await h.tombol(page).click();
    await expect(page.getByRole("status").filter({ hasText: "Sudah dicek" })).toHaveText(
      `Sudah dicek ${jamWib(duaMenit)} WIB · data terbaru dari ${jamBaru} WIB. ` +
        `Data cuaca diambil ulang paling cepat 15 menit sekali, berikutnya ${jamBerikutnya} WIB.`,
    );
    await expect(h.jamData(page, jamBaru)).toBeVisible();
    expect(await jumlahData()).toBe(jumlahAwal + 1);
  });
}

// D-060: satu wilayah per zona waktu. Jam dibandingkan dengan data di DB yang diformat di zona itu.
const ZONA_UJI = [
  { zona: "WIB", iana: "Asia/Jakarta", desa: DESA_UJI }, // Kelurahan Bulu Lor, Kota Semarang
  { zona: "WITA", iana: "Asia/Makassar", desa: "51.71.01.1001" }, // Kelurahan Serangan, Kota Denpasar
  { zona: "WIT", iana: "Asia/Jayapura", desa: "82.71.01.1001" }, // Kelurahan Jambula, Kota Ternate
];

for (const z of ZONA_UJI) {
  test(`zona ${z.zona}: jam Beranda, Cuaca (termasuk grafik per jam), dan Risiko dalam ${z.zona} (D-060)`, async ({ page }) => {
    const jamData = async () => jamDiZona((await dataCuacaTerbaru(z.desa)).waktuAmbil, z.iana);

    await page.goto(`/?wilayah=${z.desa}`);
    await expect(page.getByRole("button", { name: `Perbarui data. Terakhir diperbarui pukul ${await jamData()} ${z.zona}` })).toBeVisible();

    await page.goto(`/cuaca?wilayah=${z.desa}`);
    const konten = page.locator("#konten");
    await expect(konten.getByRole("region", { name: "Cuaca terkini" }).getByText(`Diperbarui ${await jamData()} ${z.zona} ·`, { exact: false })).toBeVisible();
    const perJam = konten.getByRole("region", { name: "Prakiraan per jam" });
    await expect(perJam.getByText(`Angka di bawah grafik = pukul (${z.zona}).`, { exact: false })).toBeVisible();
    // Hari ini: jam 00:00 sampai jam pengamatan terkini (di zona wilayah) bertanda "sudah lewat".
    const { waktuPengamatan } = await dataCuacaTerbaru(z.desa);
    const jamSekarang = Number(jamDiZona(waktuPengamatan, z.iana).slice(0, 2));
    await perJam.getByText("Lihat tabel per jam").click();
    const baris = perJam.getByRole("table").getByRole("row");
    await expect(baris).toHaveCount(25);
    await expect(baris.filter({ hasText: "sudah lewat" })).toHaveCount(jamSekarang + 1);
    await expect(baris.nth(jamSekarang + 1)).toContainText(`${String(jamSekarang).padStart(2, "0")}:00 (sudah lewat)`);

    await page.goto(`/risiko?wilayah=${z.desa}`);
    await expect(page.locator("#konten").getByText(`Diperbarui ${await jamData()} ${z.zona} ·`, { exact: false })).toBeVisible();
  });
}

/** Tab disembunyikan/ditampilkan lagi (HP dikunci, pindah aplikasi/tab); Chromium headless selalu "visible". */
async function aturVisibilitas(page: Page, status: "hidden" | "visible") {
  await page.evaluate((s) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => s });
    Object.defineProperty(document, "hidden", { configurable: true, get: () => s === "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  }, status);
}

const HALAMAN_PEMBARUAN_OTOMATIS = [
  {
    nama: "Beranda",
    url: `/?wilayah=${DESA_UJI}`,
    api: "**/api/risiko?*",
    siap: (page: Page) => page.getByRole("button", { name: /^Perbarui data\./ }),
    ubah: (data: Record<string, unknown>, ke: number) => {
      data.deskripsi = `UJI: deskripsi pembaruan otomatis ${ke}.`;
    },
    terbaru: (page: Page, ke: number) => page.getByRole("heading", { name: `UJI: deskripsi pembaruan otomatis ${ke}.` }),
  },
  {
    nama: "Cuaca",
    url: `/cuaca?wilayah=${DESA_UJI}`,
    api: "**/api/cuaca?*",
    siap: (page: Page) => page.getByRole("region", { name: "Cuaca terkini" }),
    ubah: (data: Record<string, unknown>, ke: number) => {
      (data.terkini as Record<string, unknown>).suhu = 40 + ke + 0.5;
      data.waktuAmbil = `2026-01-01T0${4 + ke}:07:00.000Z`; // 12:07 / 13:07 WIB
    },
    terbaru: (page: Page, ke: number) =>
      page
        .getByRole("region", { name: "Cuaca terkini" })
        .filter({ hasText: `${40 + ke},5°C` })
        .filter({ hasText: `Diperbarui ${11 + ke}:07 WIB` }),
  },
];

for (const h of HALAMAN_PEMBARUAN_OTOMATIS) {
  test(`${h.nama}: pembaruan otomatis 30 menit & saat kembali ke tab, tanpa router.refresh (D-056)`, async ({ page }) => {
    await page.clock.install();
    // router.refresh() = permintaan RSC tanpa header prefetch; pembaruan harus lewat API, bukan ini.
    let refreshRsc = 0;
    page.on("request", (req) => {
      const header = req.headers();
      if (header.rsc === "1" && !header["next-router-prefetch"]) refreshRsc++;
    });
    await page.goto(h.url);
    await expect(h.siap(page)).toBeVisible();

    let permintaan = 0;
    await page.route(h.api, async (route) => {
      permintaan++;
      const res = await route.fetch();
      const json = (await res.json()) as { data: Record<string, unknown> };
      h.ubah(json.data, permintaan);
      await route.fulfill({ response: res, json });
    });

    // 29 menit, termasuk kembali ke tab: data belum dianggap lama → tidak ada pembaruan.
    await page.clock.fastForward("29:00");
    await aturVisibilitas(page, "hidden");
    await aturVisibilitas(page, "visible");
    // Menit ke-30: timer memperbarui lewat API.
    await page.clock.fastForward("01:00");
    await expect(h.terbaru(page, 1)).toBeVisible();
    expect(permintaan).toBe(1);

    // HP terkunci / tab di latar belakang: jam dinding maju 31 menit, timer tidak berjalan (setSystemTime
    // tidak menjalankan timer). Saat pengguna kembali, data yang sudah >30 menit langsung diperbarui.
    await aturVisibilitas(page, "hidden");
    const sekarang = await page.evaluate(() => Date.now());
    await page.clock.setSystemTime(sekarang + 31 * 60 * 1000);
    await page.waitForTimeout(500);
    expect(permintaan).toBe(1);
    await aturVisibilitas(page, "visible");
    await expect(h.terbaru(page, 2)).toBeVisible();
    expect(permintaan).toBe(2);
    expect(refreshRsc).toBe(0);
  });
}

test.describe("state machine risiko (wilayah disimulasikan TINGGI)", () => {
  test("Bahaya → jalur push & grafik → join → Detail Penanganan → Final (ditutup)", async ({ page }) => {
    await page.goto(`/risiko?wilayah=${WILAYAH_SIMULASI}`);
    await expect(page.getByRole("alert").filter({ hasText: /Bahaya potensi banjir terdeteksi|Ikuti langkah penanganan/ })).toBeVisible();

    // Perangkat tidak berlangganan wilayah ini → peringatan dalam aplikasi.
    await expect(page.getByText(/Risiko banjir TINGGI di Kelurahan Bandengan, Kota Pekalongan/)).toBeVisible();
    // Kedua jalur selesai → join → Detail Penanganan.
    await expect(page.getByText("Detail penanganan", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Penanganan \(risiko tinggi\)/ })).toBeFocused();
    await expect(page.getByRole("button", { name: "Aktifkan notifikasi push untuk wilayah ini" })).toBeVisible();
    // D-048: grafik 48 jam tampil di Bahaya dan tetap ada di Detail Penanganan.
    const judulGrafik = page.getByRole("heading", { name: "Curah hujan 48 jam" });
    await expect(judulGrafik).toBeVisible();

    await page.getByRole("button", { name: "Tutup peringatan" }).click();
    await expect(page.getByText("Peringatan ditutup")).toBeVisible();
    await expect(page.getByText("Selesai", { exact: true })).toBeVisible();
    // Final: episode Bahaya selesai, grafik tidak ditampilkan lagi.
    await expect(judulGrafik).toHaveCount(0);
  });

  test("Beranda risiko tinggi: badge, label simulasi, ajakan penyelamatan, kontak darurat", async ({ page }) => {
    await page.goto(`/?wilayah=${WILAYAH_SIMULASI}`);
    // Dibatasi ke #konten: selama streaming, isi Suspense sempat ada di template tersembunyi di akhir <body>.
    const konten = page.locator("#konten");
    await expect(konten.getByText("Risiko Tinggi", { exact: true })).toBeVisible();
    await expect(konten.getByText(/^SIMULASI: level ini hasil uji coba/)).toBeVisible();
    await expect(konten.getByRole("img", { name: "Ilustrasi 3D: air naik sampai tanda level Tinggi" })).toBeVisible();
    await expect(konten.getByRole("list", { name: "Skala level risiko" }).locator('[aria-current="step"]')).toContainText("Tinggi");
    await expect(konten.getByRole("link", { name: "Lihat langkah penyelamatan" })).toHaveAttribute(
      "href",
      `/risiko?wilayah=${WILAYAH_SIMULASI}`,
    );
    const kontak = konten.getByRole("link", { name: /Kontak darurat/ });
    await expect(kontak).toHaveCSS("background-color", "rgb(180, 20, 28)");
    await kontak.click();
    await expect(page).toHaveURL(`/kontak?wilayah=${WILAYAH_SIMULASI}`);
    await expect(page.getByRole("heading", { name: "Nomor Darurat", level: 1 })).toBeVisible();
  });

  test("deep link notifikasi #penanganan langsung ke Detail Penanganan", async ({ page }) => {
    await page.goto(`/risiko?wilayah=${WILAYAH_SIMULASI}#penanganan`);
    await expect(page.getByText("Detail penanganan", { exact: true })).toBeVisible();
    await expect(page.getByText("Ikuti langkah penanganan di bawah")).toBeVisible();
  });
});

test.describe("Nomor Darurat (D-050)", () => {
  test("112 utama; konfirmasi sebelum menelepon; BPBD tanpa nomor resmi", async ({ page }, testInfo) => {
    await page.goto(`/kontak?wilayah=${DESA_UJI}`);
    const konten = page.locator("#konten");
    await expect(konten.getByRole("heading", { name: "Nomor Darurat", level: 1 })).toBeVisible();
    await expect(konten.getByText("Kelurahan Bulu Lor, Kota Semarang", { exact: true })).toBeVisible();
    await expect(konten.getByText(/Layanan 112 Kota Semarang sudah diluncurkan sejak/)).toBeVisible();
    await expect(konten.getByRole("note")).toHaveCount(0);
    // Board: header situs tidak tampil di HP (ada tombol Kembali).
    if (testInfo.project.name === "mobile") await expect(page.getByRole("banner")).toBeHidden();

    const utama = konten.getByRole("button", { name: /^112\s*Layanan darurat terpadu$/ });
    await utama.click();
    const konfirmasi = konten.getByRole("alertdialog", { name: "Telepon 112?" });
    await expect(konfirmasi.getByRole("button", { name: "Batal" })).toBeFocused();
    await expect(konfirmasi.getByRole("link", { name: "Ya, telepon" })).toHaveAttribute("href", "tel:112");
    await page.keyboard.press("Escape");
    await expect(konfirmasi).toHaveCount(0);
    await expect(utama).toBeFocused();

    const lainnya = konten.getByRole("region", { name: "Nomor lainnya" });
    await expect(lainnya.getByRole("listitem").first()).toContainText("BPBD Kota Semarang");
    await expect(lainnya.getByRole("listitem").first()).toContainText("Nomor belum tersedia");
    // D-051: Basarnas 115 dan Kepolisian 110, masing-masing bersumber resmi.
    await expect(lainnya.getByRole("button", { name: /^Basarnas.*115$/ })).toBeVisible();
    await expect(lainnya.getByRole("button", { name: /^Kepolisian.*110$/ })).toBeVisible();
    const sumber = konten.getByRole("region", { name: "Sumber nomor darurat nasional" });
    await expect(sumber.getByRole("link", { name: /Kabasarnas: Darurat SAR, Hubungi 115!/ })).toHaveAttribute(
      "href",
      "https://basarnas.go.id/berita/kabasarnas-darurat-sar-hubungi-115",
    );
    await expect(sumber.getByRole("link", { name: /Kontak Darurat", hal\. 82/ })).toHaveAttribute("href", /#page=84$/);
    await expect(konten.getByRole("region", { name: "Hubungi juga nomor darurat nasional" })).toHaveCount(0);
    await lainnya.getByRole("button", { name: /Call Center BNPB.*117/ }).click();
    await expect(konten.getByRole("alertdialog", { name: "Telepon 117?" }).getByRole("link", { name: "Ya, telepon" })).toHaveAttribute(
      "href",
      "tel:117",
    );
  });

  test("wilayah tanpa 112: catatan status, BPBD Provinsi DIY utama, 112 tetap ada", async ({ page }) => {
    await page.goto(`/kontak?wilayah=${DESA_TANPA_112}`);
    const konten = page.locator("#konten");
    await expect(konten.getByRole("note")).toContainText("Layanan 112 Kabupaten Kulon Progo belum tercatat diluncurkan.");
    await konten.getByRole("button", { name: /^\(0274\) 555585\s*BPBD Provinsi Daerah Istimewa Yogyakarta$/ }).click();
    await expect(konten.getByRole("link", { name: "Ya, telepon" })).toHaveAttribute("href", "tel:0274555585");
    await expect(konten.getByRole("link", { name: /Situs resmi BPBD DIY/ })).toHaveAttribute("href", "https://bpbd.jogjaprov.go.id/beranda");
    const lainnya = konten.getByRole("region", { name: "Nomor lainnya" });
    await expect(lainnya.getByRole("button", { name: /Layanan darurat terpadu.*112/ })).toBeVisible();
  });

  test("112 belum diluncurkan tanpa BPBD bernomor: 112 didampingi nomor nasional di atas (D-051)", async ({ page }) => {
    await page.goto(`/kontak?wilayah=${DESA_TANPA_112_TANPA_BPBD}`);
    const konten = page.locator("#konten");
    await expect(konten.getByRole("note")).toContainText('Layanan 112 di Kabupaten Nias masih berstatus "Uji Coba".');
    await expect(konten.getByRole("button", { name: /^112\s*Layanan darurat terpadu$/ })).toBeVisible();
    const pendamping = konten.getByRole("region", { name: "Hubungi juga nomor darurat nasional" });
    await expect(pendamping.getByRole("button")).toHaveCount(5);
    await pendamping.getByRole("button", { name: /^115\s*Basarnas/ }).click();
    await expect(pendamping.getByRole("alertdialog", { name: "Telepon 115?" }).getByRole("link", { name: "Ya, telepon" })).toHaveAttribute(
      "href",
      "tel:115",
    );
    const lainnya = konten.getByRole("region", { name: "Nomor lainnya" });
    await expect(lainnya.getByRole("listitem")).toHaveCount(2);
    await expect(lainnya.getByRole("listitem").first()).toContainText("BPBD Kabupaten Nias");
    await expect(lainnya.getByRole("listitem").first()).toContainText("Nomor belum tersedia");
  });

  test("tanpa wilayah: nomor nasional dan ajakan memilih wilayah", async ({ page }) => {
    await page.goto("/kontak");
    const konten = page.locator("#konten");
    await expect(konten.getByText(/Wilayah belum dipilih/)).toBeVisible();
    await expect(konten.getByRole("button", { name: /^112\s*Layanan darurat terpadu$/ })).toBeVisible();
    await expect(konten.getByRole("region", { name: "Nomor lainnya" }).getByRole("listitem")).toHaveCount(5);
  });
});

test("Informasi: tab umum bawaan; riwayat punya tautan sumber; Kembali dari artikel ke tab asal", async ({ page }) => {
  await page.goto("/informasi");
  const tabUmum = page.getByRole("tab", { name: /^Informasi umum \(\d+\)$/ });
  const tabRiwayat = page.getByRole("tab", { name: /^Riwayat kejadian \(\d+\)$/ });
  await expect(tabUmum).toHaveAttribute("aria-selected", "true");

  const umum = page.getByRole("tabpanel", { name: /Informasi umum/ });
  await expect(umum.getByText(/^Terbit /).first()).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: /Riwayat kejadian/ })).toBeHidden();

  // Tab riwayat lewat keyboard; pilihan tersimpan di URL.
  await tabUmum.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tabRiwayat).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveURL(/\/informasi\?tab=riwayat$/);
  const riwayat = page.getByRole("tabpanel", { name: /Riwayat kejadian/ });
  const sumber = riwayat.getByRole("link", { name: /BNPB, 3 Januari 2020/ });
  await expect(sumber).toHaveAttribute("href", /^https:\/\/www\.bnpb\.go\.id\/berita\//);
  await expect(sumber).toHaveAttribute("target", "_blank");
  await expect(sumber).toHaveAttribute("rel", "noopener noreferrer");

  // D-059: tanpa tanggal kejadian di sumber resmi → "Data per …"; tanggal dari rilis lain → tautan kedua.
  const kartu = (judul: string) => riwayat.getByRole("article").filter({ has: page.getByRole("heading", { name: judul }) });
  await expect(kartu("Banjir Pantura Jawa Tengah Januari 2026")).toContainText("Data per 19 Jan 2026");
  const sumut = kartu("Banjir dan Longsor Sumatra Utara November 2025");
  await expect(sumut).toContainText("24 Nov 2025");
  await expect(sumut).not.toContainText("Data per");
  await expect(sumut.getByRole("link", { name: /BNPB, 14 Desember 2025/ })).toBeVisible();
  await expect(sumut.getByText(/^Tanggal kejadian:/)).toBeVisible();
  await expect(sumut.getByRole("link", { name: /BNPB, 26 November 2025/ })).toHaveAttribute(
    "href",
    "https://www.bnpb.go.id/berita/empat-kabupaten-di-sumatera-utara-dilanda-bencana-banjir-dan-longsor-secara-bersamaan",
  );

  // Artikel riwayat → "Kembali ke Informasi" membuka tab Riwayat lagi.
  await riwayat.getByRole("heading").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/informasi\/[a-z0-9]+$/);
  await page.getByRole("link", { name: "Kembali ke Informasi" }).click();
  await expect(page.getByRole("tab", { name: /^Riwayat kejadian/ })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: /^Informasi umum/ }).click();
  await expect(page).toHaveURL(/\/informasi$/);
  await page
    .getByRole("tabpanel", { name: /Informasi umum/ })
    .getByRole("link", { name: "Mengenal Risiko Banjir Luapan Citarum di Cekungan Bandung" })
    .click();
  await expect(page.getByText("bukan laporan kejadian banjir pada tanggal tertentu", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Kembali ke Informasi" })).toHaveAttribute("href", "/informasi");
});

test("riwayat: tanggal & jam di zona lokasi kejadian, bukan zona wilayah pengguna (D-061)", async ({ page }) => {
  // Kejadian dekat tengah malam: 15:30 UTC = 22:30 WIB (25 Sep) = 00:30 WIT (26 Sep);
  // 16:30 UTC = 23:30 WIB (25 Sep) = 01:30 WIT (26 Sep).
  const hapus = await Promise.all([
    buatRiwayatUji({
      idWilayah: "82.71",
      judul: "UJI e2e D-061: kejadian 00.30 WIT di Kota Ternate",
      isi: "Kejadian uji pukul 00.30 WIT.",
      tanggal: new Date("2026-09-25T15:30:00Z"),
    }),
    buatRiwayatUji({
      idWilayah: "33.74",
      judul: "UJI e2e D-061: kejadian 23.30 WIB di Kota Semarang",
      isi: "Kejadian uji pukul 23.30 WIB.",
      tanggal: new Date("2026-09-25T16:30:00Z"),
    }),
  ]);
  try {
    const kartu = (judul: string) =>
      page.getByRole("tabpanel", { name: /Riwayat kejadian/ }).getByRole("article").filter({ has: page.getByRole("heading", { name: judul }) });

    // Pengguna memilih wilayah WIB (Semarang).
    await page.goto(`/informasi?tab=riwayat&wilayah=${DESA_UJI}`);
    await expect(kartu("UJI e2e D-061: kejadian 00.30 WIT di Kota Ternate")).toContainText("26 Sep 2026");
    const sitaro = kartu("Banjir Bandang Sitaro Januari 2026");
    await expect(sitaro).toContainText("5 Jan 2026");
    await sitaro.getByRole("heading").getByRole("link").click();
    await expect(page.getByText("Senin, 5 Januari 2026")).toBeVisible();
    await expect(page.getByText("pukul 02.30 WITA", { exact: false })).toBeVisible();

    // Pengguna memilih wilayah WIT (Ternate).
    await page.goto("/informasi?tab=riwayat&wilayah=82.71.01.1001");
    await expect(kartu("UJI e2e D-061: kejadian 23.30 WIB di Kota Semarang")).toContainText("25 Sep 2026");
    await expect(kartu("UJI e2e D-061: kejadian 00.30 WIT di Kota Ternate")).toContainText("26 Sep 2026");
  } finally {
    await Promise.all(hapus.map((h) => h()));
  }
});

test("tidak ada scroll horizontal (mobile-first)", async ({ page }) => {
  for (const url of [
    `/?wilayah=${DESA_UJI}`,
    `/risiko?wilayah=${WILAYAH_SIMULASI}`,
    `/cuaca?wilayah=${DESA_UJI}`,
    "/informasi",
    "/pengaturan",
    `/kontak?wilayah=${DESA_TANPA_112}`,
  ]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const lebar = await page.evaluate(() => ({ dokumen: document.documentElement.scrollWidth, layar: window.innerWidth }));
    expect(lebar.dokumen, `lebar halaman ${url}`).toBeLessThanOrEqual(lebar.layar);
  }
});

test.describe("PWA & keamanan", () => {
  test("manifest, ikon, service worker, dan halaman offline", async ({ page, request }) => {
    const manifest = await request.get("/manifest.json");
    expect(manifest.ok()).toBe(true);
    const isi = (await manifest.json()) as { display: string; icons: { src: string; purpose: string }[] };
    expect(isi.display).toBe("standalone");
    expect(isi.icons.some((i) => i.purpose === "maskable")).toBe(true);
    for (const i of isi.icons) expect((await request.get(i.src)).ok()).toBe(true);

    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: "Anda sedang offline" })).toBeVisible();

    await page.goto("/");
    const swAktif = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return Boolean(reg.active);
    });
    expect(swAktif).toBe(true);
  });

  test("halaman yang pernah dibuka tetap tampil saat offline; halaman baru → /offline", async ({ page, context }) => {
    await page.goto("/informasi");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // navigasi kedua lewat SW → tersimpan di cache halaman
    await expect(page.getByRole("heading", { name: "Informasi", level: 1 })).toBeVisible();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Informasi", level: 1 })).toBeVisible();
    await page.goto("/cuaca?wilayah=13.71.01.1001");
    await expect(page.getByRole("heading", { name: "Anda sedang offline" })).toBeVisible();
    await context.setOffline(false);
  });

  test("security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).not.toContain("unsafe-eval");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("endpoint cron menolak tanpa CRON_SECRET", async ({ request }) => {
    expect((await request.get("/api/cron/update-weather")).status()).toBe(401);
  });
});
