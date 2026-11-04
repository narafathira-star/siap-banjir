import type { CSSProperties } from "react";
import type { TingkatRisiko } from "@prisma/client";
import { GAYA_LEVEL } from "@/components/risiko/gaya-level";
import { LABEL_LEVEL } from "@/lib/risiko";

/**
 * Ilustrasi 3D (CSS transform, tanpa library): sebidang tanah dengan dua rumah, pohon, dan papan
 * penanda tiga warna; air naik sesuai level. Hanya simbol level, bukan tinggi air sebenarnya.
 * Animasi di globals.css (sb-*) dimatikan saat prefers-reduced-motion.
 */
const SISI = 190;

const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });
const dinding = (s: CSSProperties): CSSProperties => abs({ transformOrigin: "50% 100%", transform: "rotateX(-90deg)", ...s });
const sampingKiri = (s: CSSProperties): CSSProperties => abs({ transformOrigin: "0% 50%", transform: "rotateY(-90deg)", ...s });
const jendela = (s: CSSProperties): CSSProperties => abs({ background: "#9cc7ee", border: "2px solid #ffffff", ...s });

/** Posisi tetes hujan deterministik (sama di server & klien). */
function daftarTetes(jumlah: number) {
  return Array.from({ length: jumlah }, (_, i) => ({
    kiri: (i * 37 + 11) % 100,
    tunda: ((i * 0.29) % 1.3).toFixed(2),
    durasi: (0.75 + (i % 5) * 0.09).toFixed(2),
  }));
}

export function IlustrasiAir({ level }: { level: TingkatRisiko }) {
  const { tinggiAir, jumlahTetes, langit } = GAYA_LEVEL[level].ilustrasi;
  return (
    <div
      role="img"
      aria-label={`Ilustrasi 3D: air naik sampai tanda level ${LABEL_LEVEL[level]}`}
      className="relative flex h-[250px] items-center justify-center overflow-hidden rounded-[18px]"
      style={{ background: langit, perspective: 1000, perspectiveOrigin: "50% 25%" }}
    >
      <div
        className="relative"
        style={{ width: SISI, height: SISI, marginTop: 56, transformStyle: "preserve-3d", transform: "rotateX(58deg) rotateZ(-40deg)" }}
      >
        {/* Tanah + jalan */}
        <div style={abs({ left: 0, top: 0, width: SISI, height: SISI, background: "#9bcb82" })}>
          <div style={abs({ left: 0, top: 88, width: SISI, height: 14, background: "#d2c9b6" })} />
        </div>
        <div style={dinding({ left: 0, top: SISI, width: SISI, height: 22, background: "#7a5a3a", transformOrigin: "50% 0%" })} />
        <div style={abs({ left: -22, top: 0, width: 22, height: SISI, background: "#5e4329", transformOrigin: "100% 50%", transform: "rotateY(-90deg)" })} />

        {/* Rumah besar */}
        <div style={dinding({ left: 96, top: 25, width: 60, height: 52, background: "#f4ecdc" })}>
          <div style={jendela({ left: 7, top: 12, width: 14, height: 12 })} />
          <div style={jendela({ left: 39, top: 12, width: 14, height: 12 })} />
          <div style={abs({ left: 24, bottom: 0, width: 12, height: 24, background: "#6b4a2e", borderRadius: "2px 2px 0 0" })} />
        </div>
        <div
          style={sampingKiri({
            left: 96,
            top: 22,
            width: 74,
            height: 55,
            background: "#dccfb6",
            clipPath: "polygon(0 0, 52px 0, 74px 50%, 52px 100%, 0 100%)",
          })}
        >
          <div style={jendela({ left: 20, top: 20, width: 13, height: 15, background: "#86b4e0" })} />
        </div>
        <div
          style={abs({
            left: 92,
            top: 42,
            width: 68,
            height: 35,
            background: "repeating-linear-gradient(0deg, #a85b3d 0px, #a85b3d 6px, #8f4a30 6px, #8f4a30 7px)",
            transformOrigin: "50% 100%",
            transform: "translateZ(52px) rotateX(-38.66deg)",
          })}
        />

        {/* Rumah kecil */}
        <div style={dinding({ left: 18, top: 120, width: 44, height: 38, background: "#f4ecdc" })}>
          <div style={jendela({ left: 5, top: 9, width: 11, height: 10 })} />
          <div style={abs({ left: 24, bottom: 0, width: 10, height: 20, background: "#6b4a2e", borderRadius: "2px 2px 0 0" })} />
        </div>
        <div
          style={sampingKiri({
            left: 18,
            top: 118,
            width: 54,
            height: 40,
            background: "#dccfb6",
            clipPath: "polygon(0 0, 38px 0, 54px 50%, 38px 100%, 0 100%)",
          })}
        />
        <div
          style={abs({
            left: 15,
            top: 132,
            width: 50,
            height: 26,
            background: "repeating-linear-gradient(0deg, #7c8c9e 0px, #7c8c9e 5px, #66768a 5px, #66768a 6px)",
            transformOrigin: "50% 100%",
            transform: "translateZ(38px) rotateX(-38.66deg)",
          })}
        />

        {/* Semak */}
        <div style={dinding({ left: 150, top: 124, width: 16, height: 12, background: "#2f7a33" })} />
        <div style={sampingKiri({ left: 150, top: 120, width: 12, height: 16, background: "#256628" })} />
        <div style={abs({ left: 150, top: 120, width: 16, height: 16, background: "#4e9c48", transform: "translateZ(12px)" })} />

        {/* Papan penanda level: hijau, kuning, merah dari bawah */}
        <div style={dinding({ left: 136, top: 128, width: 12, height: 44, background: "#ffffff", border: "1px solid #1f2937" })}>
          <div style={abs({ left: 0, right: 0, bottom: 0, height: 7, background: "var(--risk-rendah)" })} />
          <div style={abs({ left: 0, right: 0, bottom: 7, height: 7, background: "var(--risk-sedang)" })} />
          <div style={abs({ left: 0, right: 0, bottom: 14, height: 10, background: "var(--risk-tinggi)" })} />
        </div>

        {/* Air */}
        <div
          className="sb-naik"
          style={abs({
            left: 0,
            top: 0,
            width: SISI,
            height: SISI,
            background: "rgba(37, 117, 214, 0.5)",
            boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.6)",
            transform: `translateZ(${tinggiAir}px)`,
          })}
        >
          <div
            className="sb-kilau"
            style={abs({
              left: 0,
              top: 0,
              width: SISI,
              height: SISI,
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 10px, rgba(255,255,255,0.3) 10px, rgba(255,255,255,0.3) 12px, rgba(255,255,255,0) 12px, rgba(255,255,255,0) 22px)",
              backgroundSize: "31.11px 31.11px",
            })}
          />
        </div>
        <div
          className="sb-tumbuh-h"
          style={abs({
            left: 0,
            bottom: 0,
            width: SISI,
            height: tinggiAir,
            background: "rgba(22, 84, 178, 0.62)",
            transformOrigin: "50% 100%",
            transform: "rotateX(-90deg)",
          })}
        />
        <div
          className="sb-tumbuh-w"
          style={sampingKiri({ left: 0, top: 0, width: tinggiAir, height: SISI, background: "rgba(16, 66, 150, 0.66)" })}
        />
      </div>

      {daftarTetes(jumlahTetes).map((t, i) => (
        <div
          key={i}
          className="sb-tetes"
          style={abs({
            top: 0,
            left: `${t.kiri}%`,
            width: 2,
            height: 16,
            borderRadius: 2,
            background: "rgba(23, 66, 201, 0.55)",
            animationDuration: `${t.durasi}s`,
            animationDelay: `${t.tunda}s`,
          })}
        />
      ))}
    </div>
  );
}
