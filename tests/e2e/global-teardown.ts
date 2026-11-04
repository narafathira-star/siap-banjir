import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { DEVICE_TOKEN_UJI, WILAYAH_SIMULASI } from "./bantuan";

/** Pulihkan simulasi dan hapus perangkat uji e2e. */
export default async function globalTeardown() {
  execSync(`npm run simulasi -- pulihkan ${WILAYAH_SIMULASI}`, { stdio: "inherit" });

  const db = new PrismaClient();
  try {
    const perangkat = await db.perangkat.findMany({
      where: { deviceToken: { in: DEVICE_TOKEN_UJI } },
      select: { idPengguna: true },
    });
    const hasil = await db.pengguna.deleteMany({ where: { idPengguna: { in: perangkat.map((p) => p.idPengguna) } } });
    console.log(`Perangkat uji e2e dihapus: ${hasil.count}`);
  } finally {
    await db.$disconnect();
  }
}
