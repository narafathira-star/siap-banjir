import { describe, expect, it } from "vitest";
import { asalSama } from "@/server/asal";

const buat = (headers: Record<string, string>) => ({ headers: new Headers(headers) }) as unknown as Request;

describe("asalSama", () => {
  it("tanpa Origin (curl/server) -> diizinkan", () => {
    expect(asalSama(buat({ host: "localhost:3000" }))).toBe(true);
  });

  it("Origin sama dengan host -> diizinkan", () => {
    expect(asalSama(buat({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
    expect(asalSama(buat({ host: "localhost:8443", origin: "https://localhost:8443" }))).toBe(true);
  });

  it.each([
    { origin: "https://evil.example", kasus: "situs lain" },
    { origin: "http://localhost:9999", kasus: "port berbeda" },
    { origin: "https://localhost.evil.example", kasus: "host menyerupai" },
    { origin: "null", kasus: "Origin null (sandbox)" },
    { origin: "bukan-url", kasus: "Origin tidak valid" },
  ])("menolak: $kasus", ({ origin }) => {
    expect(asalSama(buat({ host: "localhost:3000", origin }))).toBe(false);
  });

  it("ada Origin tetapi tidak ada Host -> ditolak", () => {
    expect(asalSama(buat({ origin: "http://localhost:3000" }))).toBe(false);
  });
});
