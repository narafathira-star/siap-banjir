import { execSync } from "node:child_process";
import { WILAYAH_SIMULASI } from "./bantuan";

/** Simulasikan risiko TINGGI di satu wilayah agar alur Bahaya state machine bisa diuji. */
export default function globalSetup() {
  execSync(`npm run simulasi -- aktifkan ${WILAYAH_SIMULASI} TINGGI`, { stdio: "inherit" });
}
