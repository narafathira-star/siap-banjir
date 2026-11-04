import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const dev = process.env.NODE_ENV === "development";

/**
 * CSP dasar (lihat DECISIONS D-028). 'unsafe-inline' untuk script dibutuhkan skrip inline
 * Next.js tanpa nonce; tidak ada skrip pihak ketiga yang dimuat.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolokasi hanya untuk fitur "Gunakan lokasi saya" di situs sendiri.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/**
 * Folder build (D-040, D-058): `next dev` memakai `.next`; `next build`/`next start` (termasuk server e2e)
 * memakai `.next-prod`, agar build dan e2e tidak merusak `.next` milik `next dev` yang sedang jalan.
 * Vercel tetap `.next`. `NEXT_DIST_DIR` mengalahkan keduanya.
 */
function folderBuild(phase: string) {
  if (process.env.NEXT_DIST_DIR) return process.env.NEXT_DIST_DIR;
  if (phase === PHASE_DEVELOPMENT_SERVER || process.env.VERCEL) return ".next";
  return ".next-prod";
}

const configDasar: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Barrel "radix-ui" menarik semua primitive jika tidak dioptimasi.
    optimizePackageImports: ["radix-ui"],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Service worker harus selalu versi terbaru.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json; charset=utf-8" }],
      },
    ];
  },
};

export default function nextConfig(phase: string): NextConfig {
  return { ...configDasar, distDir: folderBuild(phase) };
}
