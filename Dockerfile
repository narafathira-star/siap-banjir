# syntax=docker/dockerfile:1
# Siap Banjir - image aplikasi (Next.js 15 + Prisma 6).
# Satu image dipakai untuk: server web, migrasi, seed, dan penjadwal cron.
# Semua dependency (termasuk devDependencies) dipertahankan karena `prisma migrate`,
# `prisma db seed` (tsx), dan `scripts/cron-lokal.ts` dijalankan di dalam container.
#
# Confidentiality: proses berjalan sebagai user biasa `node` (bukan root),
# jadi kalau aplikasi berhasil dibobol, penyerang tidak langsung punya hak root di container.

FROM node:22-bookworm-slim

# Prisma butuh OpenSSL; ca-certificates untuk memanggil Open-Meteo lewat HTTPS.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# /app dibuat milik user `node` sebelum berpindah user (tanpa chown -R yang menggandakan ukuran image).
RUN mkdir /app && chown node:node /app
WORKDIR /app
USER node

# Layer dependency: `postinstall` menjalankan `prisma generate`, jadi folder prisma harus ada.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma
RUN npm ci

COPY --chown=node:node . .

# NEXT_PUBLIC_* ditanam ke bundle browser saat build (ubah nilainya -> build ulang image).
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY=""
ARG NEXT_PUBLIC_APP_URL="http://localhost:3000"
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1

# URL database palsu hanya untuk build; nilai asli diberikan saat container berjalan.
# Hasil build ada di .next-prod (lihat next.config.ts), dibaca oleh `next start`.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build" \
    npm run build

ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

EXPOSE 3000
CMD ["npm", "start"]