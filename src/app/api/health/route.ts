/**
 * Health check untuk Docker/monitoring (aspek Availability).
 * Memeriksa bahwa server hidup DAN database bisa dijangkau.
 * Sengaja tidak membocorkan detail galat (aspek Confidentiality).
 */
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const TANPA_CACHE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: TANPA_CACHE });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 503, headers: TANPA_CACHE });
  }
}
