/** Deteksi sederhana jenis perangkat & browser dari user agent (hanya untuk tabel Perangkat). */
export function deteksiJenisPerangkat(ua: string): "mobile" | "tablet" | "desktop" {
  if (/iPad|Tablet|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
}

export function deteksiBrowser(ua: string): string {
  const pola: [RegExp, string][] = [
    [/Edg(A|iOS)?\//, "Edge"],
    [/OPR\/|Opera/, "Opera"],
    [/SamsungBrowser\//, "Samsung Internet"],
    [/Firefox\/|FxiOS\//, "Firefox"],
    [/Chrome\/|CriOS\//, "Chrome"],
    [/Safari\//, "Safari"],
  ];
  return pola.find(([re]) => re.test(ua))?.[1] ?? "Lainnya";
}
