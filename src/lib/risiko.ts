/** Konstanta level & parameter risiko yang dipakai server dan UI. */
import type { ParameterRisiko, TingkatRisiko } from "@prisma/client";

export const URUTAN_LEVEL: Record<TingkatRisiko, number> = { RENDAH: 0, SEDANG: 1, TINGGI: 2 };

/** Penanda risiko hasil `npm run simulasi` di deskripsi, judul notifikasi, dan UI (D-041). */
export const LABEL_SIMULASI = "[SIMULASI]";

export const LABEL_LEVEL: Record<TingkatRisiko, string> = {
  RENDAH: "Rendah",
  SEDANG: "Sedang",
  TINGGI: "Tinggi",
};

export const PARAMETER_RISIKO: Record<ParameterRisiko, { label: string; satuan: string }> = {
  hujan_1jam: { label: "Curah hujan 1 jam terakhir", satuan: "mm" },
  hujan_24jam: { label: "Curah hujan 24 jam terakhir", satuan: "mm" },
  hujan_3hari: { label: "Akumulasi hujan 3 hari", satuan: "mm" },
  prakiraan_hujan_24jam: { label: "Prakiraan hujan 24 jam ke depan", satuan: "mm" },
  peluang_hujan_max: { label: "Peluang hujan tertinggi 24 jam ke depan", satuan: "%" },
};

export function formatNilaiParameter(parameter: ParameterRisiko, nilai: number) {
  const { satuan } = PARAMETER_RISIKO[parameter];
  const angka = satuan === "%" ? Math.round(nilai) : Math.round(nilai * 10) / 10;
  return `${angka.toLocaleString("id-ID")}${satuan === "%" ? "%" : ` ${satuan}`}`;
}
