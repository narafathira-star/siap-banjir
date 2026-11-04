import { TriangleAlert } from "lucide-react";

/** Versi ringkas di halaman Risiko; kalimat lengkap (DISCLAIMER) ada di footer setiap halaman. */
export function Disclaimer() {
  return (
    <p
      role="note"
      className="flex items-start gap-2.5 rounded-[14px] border border-[#d9b300] bg-risk-sedang-tint px-3.5 py-3 text-[13px] leading-normal text-[#4a3b00]"
    >
      <TriangleAlert className="mt-px size-[18px] shrink-0" strokeWidth={2.2} aria-hidden="true" />
      <span>Estimasi dari data cuaca, bukan peringatan resmi. Ikuti arahan BMKG, BPBD, dan pemerintah setempat.</span>
    </p>
  );
}
