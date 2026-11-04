# Lisensi data wilayah

File di folder ini (`wilayah.tsv.gz`, `laporan-impor-wilayah.md`, `sumber-wilayah.json`) dibuat oleh
`scripts/impor-wilayah.ts` dari dua repositori berikut. Keduanya berlisensi MIT; teks lisensi asli
disalin utuh di bawah sesuai syarat lisensi tersebut.

| Data | Repositori | Commit |
| --- | --- | --- |
| Kode & nama wilayah (Kepmendagri No. 300.2.2-2430 Tahun 2025) | [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) | [`55a496d`](https://github.com/cahyadsn/wilayah/tree/55a496d3662bf173a65d6860f75ed6be625f2430) |
| Koordinat (centroid batas wilayah) | [cahyadsn/wilayah_boundaries](https://github.com/cahyadsn/wilayah_boundaries) | [`3c5a796`](https://github.com/cahyadsn/wilayah_boundaries/tree/3c5a7960f4d227a38489094d84252bdbb3f978a5) |

Perubahan yang dilakukan Siap Banjir: hanya kolom kode, nama, dan titik tengah (centroid) poligon
yang diambil; poligon batas wilayah tidak disertakan. Desa/kelurahan tanpa data batas memakai titik
tengah kecamatannya (kolom `perkiraan` = 1). Rincian ada di `laporan-impor-wilayah.md`.

---

## cahyadsn/wilayah

```
MIT License

Copyright (c) 2017-2025 Cahya DSN

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## cahyadsn/wilayah_boundaries

```
MIT License

Copyright (c) 2024 Cahya DSN

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
