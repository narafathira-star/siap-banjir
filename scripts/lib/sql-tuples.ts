/**
 * Parser streaming untuk tuple `INSERT ... VALUES (...), (...);` dari dump SQL MySQL.
 * Dirancang untuk file besar (polygon ratusan MB): kolom dengan indeks ≥ `maksKolom`
 * dilewati tanpa disimpan di memori.
 *
 * Mendukung string '...' dengan escape backslash (\', \\, \n) maupun kutip ganda (''),
 * angka, dan NULL. Tanda kurung di dalam string diabaikan.
 */
export type NilaiSql = string | number | null;

type Mode = "luar" | "tuple" | "string" | "escape" | "kutip-akhir";

export class ParserTupleSql {
  private mode: Mode = "luar";
  private sesudahValues = false;
  private kataLuar = "";
  private kolom = 0;
  private buffer = "";
  private stringKolom = false;
  private tuple: NilaiSql[] = [];

  constructor(
    private readonly onTuple: (tuple: NilaiSql[]) => void,
    private readonly maksKolom = Number.POSITIVE_INFINITY,
  ) {}

  private simpan() {
    return this.kolom < this.maksKolom;
  }

  private akhiriKolom() {
    if (this.simpan()) {
      if (this.stringKolom) {
        this.tuple.push(this.buffer);
      } else {
        const t = this.buffer.trim();
        this.tuple.push(t === "" || t.toUpperCase() === "NULL" ? null : Number(t));
      }
    }
    this.buffer = "";
    this.stringKolom = false;
    this.kolom++;
  }

  tulis(potongan: string) {
    for (let i = 0; i < potongan.length; i++) {
      const c = potongan[i] as string;
      switch (this.mode) {
        case "luar":
          if (c === ";") {
            this.sesudahValues = false;
            this.kataLuar = "";
          } else if (c === "(" && this.sesudahValues) {
            this.mode = "tuple";
            this.kolom = 0;
            this.buffer = "";
            this.stringKolom = false;
            this.tuple = [];
          } else if (/[A-Za-z]/.test(c)) {
            this.kataLuar = (this.kataLuar + c).slice(-6).toUpperCase();
            if (this.kataLuar === "VALUES") this.sesudahValues = true;
          } else {
            this.kataLuar = "";
          }
          break;
        case "tuple":
          if (c === "'") {
            this.mode = "string";
            this.stringKolom = true;
          } else if (c === ",") {
            this.akhiriKolom();
          } else if (c === ")") {
            this.akhiriKolom();
            this.onTuple(this.tuple);
            this.mode = "luar";
          } else if (this.simpan()) {
            this.buffer += c;
          }
          break;
        case "string":
          if (c === "\\") this.mode = "escape";
          else if (c === "'") this.mode = "kutip-akhir";
          else if (this.simpan()) this.buffer += c;
          break;
        case "escape":
          if (this.simpan()) this.buffer += c === "n" ? "\n" : c === "t" ? "\t" : c;
          this.mode = "string";
          break;
        case "kutip-akhir":
          // '' di dalam string = satu kutip; selain itu string sudah selesai.
          if (c === "'") {
            if (this.simpan()) this.buffer += "'";
            this.mode = "string";
          } else {
            this.mode = "tuple";
            i--; // proses ulang karakter ini dalam mode tuple
          }
          break;
      }
    }
  }
}

/** Parse seluruh teks sekaligus (untuk file kecil & test). */
export function parseTupleSql(teks: string, maksKolom?: number): NilaiSql[][] {
  const hasil: NilaiSql[][] = [];
  const parser = new ParserTupleSql((t) => hasil.push(t), maksKolom);
  parser.tulis(teks);
  return hasil;
}
