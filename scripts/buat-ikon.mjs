/**
 * Buat ikon PWA (PNG) dari logo SVG. Jalankan ulang jika logo berubah:
 *   node scripts/buat-ikon.mjs
 * Memakai sharp yang sudah terpasang sebagai dependensi Next.js.
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const BIRU = "#1d4ed8";
const PERISAI = "M16 2 4 6.5v8.2c0 7.3 5 13.3 12 15.3 7-2 12-8 12-15.3V6.5L16 2Z";
const TETES = "M16 7.5c-2.9 3.9-5.5 7.3-5.5 10.3a5.5 5.5 0 0 0 11 0c0-3-2.6-6.4-5.5-10.3Z";
const TANDA = `<rect x="15" y="12.5" width="2" height="5.5" rx="1"/><circle cx="16" cy="20.5" r="1.2"/>`;

/** Logo di atas latar; `skala` = porsi logo terhadap sisi kanvas. */
function svgLogo({ latar, skala, warnaPerisai, warnaTetes, warnaTanda, sudut = 0 }) {
  const ukuran = 32 * skala;
  const offset = (32 - ukuran) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    ${latar ? `<rect width="32" height="32" rx="${sudut}" fill="${latar}"/>` : ""}
    <g transform="translate(${offset} ${offset}) scale(${skala})">
      <path d="${PERISAI}" fill="${warnaPerisai}"/>
      <path d="${TETES}" fill="${warnaTetes}"/>
      <g fill="${warnaTanda}">${TANDA}</g>
    </g>
  </svg>`);
}

/** Badge notifikasi Android: siluet putih, tetes dilubangi (hanya kanal alfa yang dipakai). */
const svgBadge = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs><mask id="m"><rect width="32" height="32" fill="#fff"/><path d="${TETES}" fill="#000"/></mask></defs>
  <path d="${PERISAI}" fill="#fff" mask="url(#m)"/>
</svg>`);

const ikon = [
  // purpose "any": logo biru di latar transparan.
  { file: "icon-192.png", px: 192, svg: svgLogo({ skala: 0.9, warnaPerisai: BIRU, warnaTetes: "#fff", warnaTanda: BIRU }) },
  { file: "icon-512.png", px: 512, svg: svgLogo({ skala: 0.9, warnaPerisai: BIRU, warnaTetes: "#fff", warnaTanda: BIRU }) },
  // purpose "maskable": latar penuh, logo di dalam zona aman (lingkaran 80%).
  {
    file: "maskable-512.png",
    px: 512,
    svg: svgLogo({ latar: BIRU, skala: 0.6, warnaPerisai: "#fff", warnaTetes: BIRU, warnaTanda: "#fff" }),
  },
  // iOS: tidak mendukung transparansi, latar penuh.
  {
    file: "apple-touch-icon.png",
    px: 180,
    svg: svgLogo({ latar: BIRU, skala: 0.7, warnaPerisai: "#fff", warnaTetes: BIRU, warnaTanda: "#fff" }),
  },
  { file: "badge-72.png", px: 72, svg: svgBadge },
];

await mkdir("public/icons", { recursive: true });
for (const { file, px, svg } of ikon) {
  await sharp(svg, { density: 72 * (px / 32) }).resize(px, px).png().toFile(`public/icons/${file}`);
  console.log(`public/icons/${file} (${px}×${px})`);
}
