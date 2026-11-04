import { describe, expect, it } from "vitest";
import { ParserTupleSql, parseTupleSql } from "../../scripts/lib/sql-tuples";

describe("parser tuple SQL", () => {
  it("membaca kode & nama, termasuk escape kutip", () => {
    const sql = `CREATE TABLE wilayah (kode varchar(13), nama varchar(100));
INSERT INTO wilayah (kode, nama) VALUES
('11','Aceh'),
('11.01','Kabupaten Aceh Selatan'),
('11.01.01.2001','Keude (Bakongan)'),
('73.01.01.2002','Ta\\'juk'),
('73.01.01.2003','Ta''jak');`;
    expect(parseTupleSql(sql)).toEqual([
      ["11", "Aceh"],
      ["11.01", "Kabupaten Aceh Selatan"],
      ["11.01.01.2001", "Keude (Bakongan)"],
      ["73.01.01.2002", "Ta'juk"],
      ["73.01.01.2003", "Ta'jak"],
    ]);
  });

  it("angka, NULL, dan kolom polygon dilewati dengan maksKolom", () => {
    const sql = `INSERT INTO wilayah_boundaries(kode,nama,lat,lng,path) VALUES
\t('36.71.01.1001','Sukarasa',-6.1728843824017146,106.63185148661755,'[[[-6.16,106.63],[-6.17,106.64]]]'),
\t('36.71.01.1002','Tanpa Koordinat',NULL,NULL,NULL);`;
    expect(parseTupleSql(sql, 4)).toEqual([
      ["36.71.01.1001", "Sukarasa", -6.1728843824017146, 106.63185148661755],
      ["36.71.01.1002", "Tanpa Koordinat", null, null],
    ]);
  });

  it("tahan terhadap potongan stream yang memotong di tengah string/escape", () => {
    const sql = "INSERT INTO t VALUES ('a\\'b','x''y',1.5),('c',NULL,-2);";
    const hasil: unknown[] = [];
    const parser = new ParserTupleSql((t) => hasil.push(t));
    for (const c of sql) parser.tulis(c); // satu karakter per potongan
    expect(hasil).toEqual([
      ["a'b", "x'y", 1.5],
      ["c", null, -2],
    ]);
  });

  it("mengabaikan tanda kurung di luar VALUES (DDL)", () => {
    const sql = "CREATE TABLE t (a int, b varchar(10)); INSERT INTO t (a,b) VALUES (1,'x');";
    expect(parseTupleSql(sql)).toEqual([[1, "x"]]);
  });
});
