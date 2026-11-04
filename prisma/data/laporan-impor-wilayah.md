# Laporan import wilayah

Dibuat oleh `npm run data:wilayah`. Jangan diedit manual.

- Kode & nama: [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) @ `55a496d` (Kepmendagri 300.2.2-2430/2025)
- Koordinat: [cahyadsn/wilayah_boundaries](https://github.com/cahyadsn/wilayah_boundaries) @ `3c5a796` (centroid polygon)

Nama yang dipakai aplikasi **selalu dari Kemendagri**. Koordinat dari data boundaries dipakai jika kodenya ada, namanya cocok (sama atau beda ejaan), dan berada di Indonesia; selain itu dipakai koordinat induk dan wilayah ditandai **koordinat perkiraan**. Centroid yang jauh dari induknya (desa > 80 km dari kecamatan, kecamatan > 250 km dari kab/kota) dicantumkan untuk diperiksa.

## Ringkasan

| Level | Jumlah | Nama sama | Beda ejaan/penulisan (koordinat dipakai) | Nama berbeda (koordinat TIDAK dipakai) | Tidak ada di data koordinat | Koordinat kosong di sumber | Koordinat di luar Indonesia | Jauh dari induk (koordinat dipakai) | Koordinat perkiraan |
|---|---|---|---|---|---|---|---|---|---|
| PROVINSI | 38 | 38 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| KABKOTA | 514 | 514 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| KECAMATAN | 7285 | 7276 | 3 | 0 | 0 | 0 | 0 | 6 | 0 |
| DESA | 83762 | 83368 | 16 | 0 | 359 | 0 | 0 | 19 | 359 |

## Nama berbeda (0)

Tidak ada.

## Beda ejaan/penulisan (19)

Perbedaan spasi, ejaan lama/baru, atau salah ketik kecil (kemiripan ≥ 80%). Koordinat tetap dipakai; nama mengikuti Kemendagri.

| Kode | Nama Kemendagri | Nama di data koordinat |
|---|---|---|
| 11.08.25 | Geureudong Pase | Geuruedong Pase |
| 12.07.20 | Sinembah Tanjung Muda Hulu | SSinembah Tanjung Muda Hulu |
| 13.05.17 | Anam Lingkuang | nam Lingkuang |
| 35.07.09.2005 | Gedok Kulon | Gedog Kulon |
| 35.07.09.2006 | Gedok Wetan | Gedog Wetan |
| 35.14.06.2021 | Tundosoro | Tundosuro |
| 35.26.04.2010 | Tanjung Jati | Tangjung Jati |
| 52.06.14.2001 | Labuan Kananga | Labuhan Kananga |
| 53.06.17.2005 | Nisanulan | Nisamulan |
| 62.11.02.2005 | Papuyu I Sei Pasaman | Papuyu I Sei Pasanan |
| 73.73.01.1003 | Ammasangan | Amasangan |
| 73.73.04.1008 | Pentojangan | Petrojangan |
| 74.06.01.1016 | Barangga | Barangka |
| 74.06.01.2009 | Pokurumba | Pokorumba |
| 74.06.08.2009 | Batu Sempe Indah | Batu Sampe Indah |
| 81.05.16.2002 | Kwamor Kecil Mata Ata | Kwawor Kecil Mata Ata |
| 81.05.16.2003 | Kwamor Kecil Mata Wawa | Kwawor Kecil Mata Wawa |
| 81.05.16.2004 | Kwamor Besar Ena | Kwawor Besar Ena |
| 81.05.16.2005 | Kwamor Besar Witau | Kwawor Besar Witau |

## Jauh dari induk (25)

Nama cocok tetapi centroid jauh dari centroid induknya. Koordinat **tetap dipakai**: pada pemeriksaan manual (import 25 September 2026) semua kasus sah, yaitu pulau terpencil (mis. Kec. Liukang Tangaya dan Liukang Tupabbiring, Kab. Pangkajene dan Kepulauan; Kec. Tambelan, Kab. Bintan; Pekajang, Kab. Lingga; Mapia, Kab. Supiori; Kec. Dawelor Dawera, Maluku Barat Daya) atau kecamatan yang sangat luas (Kab. Kapuas Hulu, Kab. Kapuas). Periksa ulang daftar ini setiap kali data sumber diperbarui.

| Kode | Nama Kemendagri | Nama di data koordinat | Jarak ke induk |
|---|---|---|---|
| 21.01.09 | Tambelan | Tambelan | 304 km |
| 21.01.09.2008 | Pengikik | Pengikik | 84 km |
| 21.04.02.2001 | Pekajang | Pekajang | 137 km |
| 61.06.17.1002 | Kedamin Hilir | Kedamin Hilir | 80 km |
| 61.06.17.2003 | Sungai Uluk | Sungai Uluk | 82 km |
| 61.06.17.2004 | Jaras | Jaras | 84 km |
| 61.06.17.2014 | Kedamin Darat | Kedamin Darat | 80 km |
| 62.03.09.2017 | Manusup Hilir | Manusup Hilir | 81 km |
| 62.03.09.2038 | Suka Maju | Suka Maju | 82 km |
| 73.10.01 | Liukang Tangaya | Liukang Tangaya | 286 km |
| 73.10.01.2002 | Sabaru | Sabaru | 96 km |
| 73.10.01.2004 | Sabalana | Sabalana | 107 km |
| 73.10.01.2006 | Sailus | Sailus | 89 km |
| 73.10.01.2007 | Satanger | Satanger | 106 km |
| 73.10.01.2008 | Kapoposang Bali | Kapoposang Bali | 117 km |
| 73.10.01.2009 | Poleonro | Poleonro | 94 km |
| 73.10.02.2002 | Pammas | Pammas | 93 km |
| 73.10.02.2003 | Sabaru | Sabaru | 91 km |
| 81.01.01.2021 | Nua Nea | Nua Nea | 354 km |
| 81.08.04 | Babar Barat | Babar Barat | 260 km |
| 81.08.05 | Pulau-pulau Babar Timur | Pulau-Pulau Babar Timur | 272 km |
| 81.08.09 | Pulau Masela | Pulau Masela | 284 km |
| 81.08.10 | Dawelor Dawera | Dawelor Dawera | 301 km |
| 91.19.05.2007 | Mapia | Mapia | 211 km |
| 93.04.18.2005 | Tamor | Tamor | 103 km |

## Tidak ada koordinat (359)

Tidak ada di data boundaries, koordinatnya kosong, atau di luar Indonesia. Memakai koordinat induk.

| Kode | Nama Kemendagri | Nama di data koordinat |
|---|---|---|
| 11.16.06.2021 | Alur Mentawak | — |
| 11.16.08.2017 | Mekar Jaya | — |
| 11.16.11.2006 | Sumber Makmur | — |
| 13.06.01.2004 | Durian Kapeh Darussalam | — |
| 13.06.03.2011 | Dalko | — |
| 13.06.08.2008 | Sungai Cubadak | — |
| 13.06.08.2009 | Koto Gadang | — |
| 13.06.10.2005 | Nan Limo | — |
| 13.06.11.2007 | Salareh Aia Timur | — |
| 13.06.11.2008 | Salareh Aia Utara | — |
| 13.06.11.2009 | Salareh Aia Barat | — |
| 13.06.15.2004 | Kamang Tangah Anam Suku | — |
| 13.06.15.2005 | Pauh Kamang Mudiak | — |
| 13.08.04.2007 | Koto Kaciak Barat | — |
| 13.08.05.2007 | Tanjuang Baringin Utara | — |
| 13.08.05.2008 | Tanjuang Baringin Selatan | — |
| 13.08.05.2009 | Aia Manggih Utara | — |
| 13.08.05.2010 | Aia Manggih Selatan | — |
| 13.08.05.2011 | Aia Manggih Barat | — |
| 13.08.05.2012 | Sundata Utara | — |
| 13.08.05.2013 | Sundata Selatan | — |
| 13.08.07.2005 | Panti Utara | — |
| 13.08.08.2006 | Muaro Tais Koto Gadang | — |
| 13.08.12.2003 | Simpang Tonang Selatan | — |
| 13.08.12.2004 | Simpang Tonang Utara | — |
| 13.08.12.2005 | Cubadak Timur | — |
| 13.08.12.2006 | Cubadak Tengah | — |
| 13.08.12.2007 | Cubadak Barat | — |
| 13.08.13.2004 | Malampah Barat | — |
| 13.08.13.2005 | Ladang Panjang Barat | — |
| 13.08.14.2008 | Taruang Taruang Selatan | — |
| 13.08.14.2009 | Taruang Taruang Utara | — |
| 13.08.14.2010 | Padang Mantinggi Utara | — |
| 13.08.16.2003 | Alahan Mati Hilia | — |
| 13.08.16.2004 | Simpang Utara | — |
| 13.08.19.2004 | Lansek Kadok Barat | — |
| 13.08.19.2005 | Tanjung Betung Utara | — |
| 13.08.19.2006 | Tanjung Betung Timur | — |
| 13.12.02.2002 | Brastagi Ujung Gading | — |
| 13.12.02.2003 | Tampus Damai Ujung Gading | — |
| 13.12.02.2004 | Taluak Ambun Ujung Gading | — |
| 13.12.02.2005 | Koto Gunung Ujung Gading | — |
| 13.12.02.2006 | Koto Sawah Ujung Gading | — |
| 13.12.02.2007 | Salido Saroha Ujung Gading | — |
| 13.12.02.2008 | Kuamang Alai Ujung Gading | — |
| 13.12.02.2009 | Situak Ujung Gading | — |
| 13.12.03.2007 | Lingkuang Aua Timur | — |
| 13.12.03.2008 | Lingkuang Aua Baru | — |
| 13.12.03.2009 | Lingkuang Aua Bandarajo | — |
| 13.12.03.2010 | Lingkuang Aua Jambak | — |
| 13.12.03.2011 | Lingkuang Aua Koto Dalam | — |
| 13.12.03.2012 | Lingkuang Aua Barat | — |
| 13.12.03.2013 | Lingkuang Aua Hilia | — |
| 13.12.03.2014 | Sukomananti Aua Kuniang | — |
| 13.12.03.2015 | Aia Gadang Timur | — |
| 13.12.03.2016 | Aia Gadang Barat | — |
| 13.12.03.2017 | Pinaga Aua Kuniang | — |
| 13.12.03.2018 | Lubuak Landua Aua Kuniang | — |
| 13.12.03.2019 | Lembah Binuang Aua Kuniang | — |
| 13.12.04.2004 | Simpang Timbo Abu Kajai | — |
| 13.12.04.2005 | Kajai Selatan | — |
| 13.12.04.2006 | Sungai Janiah Talu | — |
| 13.12.04.2007 | Tabek Sirah Talu | — |
| 13.12.05.2003 | Ampek Koto | — |
| 13.12.05.2004 | Ampek Koto Barat | — |
| 13.12.05.2005 | Bancah Kariang | — |
| 13.12.05.2006 | Mudiak Labuah | — |
| 13.12.05.2007 | Tandikek | — |
| 13.12.05.2008 | Langgam Sepakat | — |
| 13.12.05.2009 | Langgam Saiyo | — |
| 13.12.05.2010 | Anam Koto Selatan | — |
| 13.12.05.2011 | Sigunanti | — |
| 13.12.05.2012 | Koto Gadang Jaya | — |
| 13.12.05.2013 | Anam Koto Utara | — |
| 13.12.05.2014 | Bandua Balai | — |
| 13.12.05.2015 | Bunuik | — |
| 13.12.05.2016 | Padang Canduh | — |
| 13.12.05.2017 | Limau Purut | — |
| 13.12.06.2003 | Seberang Kenaikan | — |
| 13.12.06.2004 | Bahoras | — |
| 13.12.06.2005 | Ranah Sungai Magelang | — |
| 13.12.06.2006 | Muaro Kiawai Barat | — |
| 13.12.06.2007 | Muaro Kiawai Hilir | — |
| 13.12.07.2003 | Batahan Utara | — |
| 13.12.07.2004 | Batahan Tengah | — |
| 13.12.07.2005 | Batahan Barat | — |
| 13.12.07.2006 | Batahan Selatan | — |
| 13.12.07.2007 | Desa Baru Barat | — |
| 13.12.08.2002 | Koto Tangah | — |
| 13.12.08.2003 | Koto Tuo | — |
| 13.12.08.2004 | Koto Nan Duo | — |
| 13.12.08.2005 | Pematang Panjang | — |
| 13.12.08.2006 | Ranah Koto Tinggi | — |
| 13.12.09.2002 | Salingka Muaro | — |
| 13.12.09.2003 | Ranah Malintang | — |
| 13.12.09.2004 | Ranah Air Haji | — |
| 13.12.09.2005 | Kasikputih Sungaitanang | — |
| 13.12.09.2006 | Aua Serumpun | — |
| 13.12.09.2007 | Sikilang Sungai Aur Selatan | — |
| 13.12.10.2003 | Giri Maju | — |
| 13.12.10.2004 | Ophir | — |
| 13.12.10.2005 | Mahakarya | — |
| 13.12.10.2006 | Sariak | — |
| 13.12.10.2007 | Sungai Talang | — |
| 13.12.10.2008 | Jambak Selatan | — |
| 13.12.10.2009 | Pujorahayu | — |
| 13.12.11.2002 | Padang Harapan | — |
| 13.12.11.2003 | Ranah Pasisie | — |
| 13.12.11.2004 | Maligi | — |
| 14.72.03.1006 | Bagan Besar Timur | — |
| 14.72.03.1007 | Bukit Kapur | — |
| 14.72.04.1006 | Sungai Geniot | — |
| 15.09.02.2018 | Kemantan | — |
| 15.09.04.1009 | Sarana Agung | — |
| 15.09.04.1010 | Mandiri Agung | — |
| 15.09.04.2011 | Mekar Kencana | — |
| 15.09.04.2012 | Purwo Dadi | — |
| 15.09.04.2013 | Tegal Asri | — |
| 15.09.04.2014 | Perintis Jaya | — |
| 15.09.04.2015 | Perintis Makmur | — |
| 15.09.04.2016 | Jaya Mulya | — |
| 15.09.07.2007 | Mekar Sari | — |
| 15.09.07.2008 | Wana Arum | — |
| 15.09.07.2009 | Wana Mulya | — |
| 15.09.07.2010 | Damai Makmur | — |
| 15.09.07.2011 | Suka Jaya | — |
| 15.09.07.2012 | Sido Mulyo | — |
| 15.09.08.2010 | Giri Mulyo | — |
| 15.09.09.2006 | Lubuk Mandarsah Ulu | — |
| 16.03.11.2009 | Ujan Mas Ulu | — |
| 16.03.22.2002 | Arisan Musi | — |
| 16.06.02.2016 | Epil Barat | — |
| 16.06.06.2043 | Toman Baru | — |
| 16.07.05.1022 | Betung Selatan | — |
| 16.07.10.1024 | Sukajadi Timur | — |
| 16.07.10.1025 | Tanah Mas Indah | — |
| 16.07.10.1026 | Rawa Maju | — |
| 16.07.10.1027 | Air Batu Jaya | — |
| 16.07.10.1028 | Sei Sedapat | — |
| 16.07.10.1029 | Azhar Permai | — |
| 16.07.10.1030 | Keramat Raya | — |
| 16.74.01.1014 | Tebing Tanah Puteh | — |
| 16.74.02.1011 | Muara Dua Barat | — |
| 16.74.02.1012 | Gunung Ibul Timur | — |
| 16.74.02.1013 | Gunung Ibul Selatan | — |
| 16.74.02.1014 | Gunung Ibul Utara | — |
| 16.74.02.1015 | Arimbi Jaya | — |
| 16.74.05.1006 | Sidomulyo | — |
| 16.74.05.1007 | Sidogede | — |
| 18.09.02.2020 | Pujodadi | — |
| 18.09.02.2021 | Grujugan Baru | — |
| 18.09.05.2032 | Dantar | — |
| 18.09.11.2011 | Kalirejo | — |
| 18.12.01.2020 | Marga Asri | — |
| 18.12.01.2021 | Mekar Asri | — |
| 18.12.03.2010 | Kagungan Ratu Agung | — |
| 18.12.03.2011 | Gading Kencana | — |
| 18.12.03.2012 | Karta Raya | — |
| 18.12.03.2013 | Karta Tanjung Selamat | — |
| 18.12.06.2010 | Sido Agung | — |
| 19.05.01.1008 | Keranggan | — |
| 19.05.01.1009 | Menjelang | — |
| 52.02.03.2011 | Lendang Tampel | — |
| 52.02.04.2017 | Dadap | — |
| 52.02.04.2018 | Kerame Jati | — |
| 52.02.06.2011 | Beleke Daye | — |
| 52.02.06.2012 | Beleke Lebe Sane | — |
| 52.02.06.2013 | Pegonak | — |
| 52.02.06.2014 | Jero Puri | — |
| 52.02.07.2013 | Prako | — |
| 52.02.07.2014 | Tibu Sisok | — |
| 52.02.07.2015 | Janggawana | — |
| 52.02.07.2016 | Lingkok Berenge | — |
| 52.02.09.2012 | Berinding | — |
| 52.02.09.2013 | Pajangan | — |
| 52.02.10.2013 | Lelong | — |
| 52.02.11.2012 | Pandan Tinggang | — |
| 52.07.02.2021 | Lamunga | — |
| 53.03.06.1015 | Boronubaen Timur | — |
| 53.07.01.2017 | Begu | — |
| 53.07.01.2018 | Kotandelu | — |
| 53.07.01.2019 | Lowolabo | — |
| 53.07.01.2020 | Aebubu | — |
| 53.07.01.2021 | Regapu’u | — |
| 53.07.01.2022 | Rejo | — |
| 53.07.02.2011 | Ratekalo | — |
| 53.07.02.2012 | Ndaimbere | — |
| 53.07.04.2018 | Nangablo | — |
| 53.07.04.2019 | Kara Kabu | — |
| 53.07.04.2020 | Tada Lado | — |
| 53.07.08.2019 | Udek Du’en | — |
| 53.07.08.2020 | Watu Omok | — |
| 53.07.08.2021 | Waipaar | — |
| 53.07.08.2022 | Baokremot | — |
| 53.07.08.2023 | Henga | — |
| 53.07.08.2024 | Likonggete | — |
| 53.07.08.2025 | Watubaing | — |
| 53.07.08.2026 | Mamai | — |
| 53.07.09.2010 | Mahe Kelan | — |
| 53.07.09.2011 | Egon Buluk | — |
| 53.07.10.2026 | Watukobu | — |
| 53.07.11.2018 | Bura Bekor | — |
| 53.07.11.2019 | Watukrus | — |
| 53.07.12.2006 | Woda Mude | — |
| 53.07.12.2007 | Legu Woda | — |
| 53.07.12.2008 | Waturia | — |
| 53.07.13.2007 | Watu Moning | — |
| 53.07.15.2011 | Gong Bekor | — |
| 53.07.16.2007 | Watu Repa | — |
| 53.07.17.2009 | Bu Barat | — |
| 53.07.17.2010 | Bu Nuapu’u | — |
| 53.07.20.2008 | Mahe Tanah | — |
| 53.07.20.2009 | Pelibaler | — |
| 53.09.01.2024 | Mawwo Kisa | — |
| 53.09.02.2039 | Dolupore | — |
| 53.09.02.2040 | Tiwo Toda | — |
| 53.09.02.2041 | Kelimolo | — |
| 53.09.02.2042 | Wogo | — |
| 53.09.02.2043 | Radabata I | — |
| 53.09.02.2044 | Bodosare | — |
| 53.09.06.2029 | Ngadhamana | — |
| 53.09.06.2030 | Bolonga | — |
| 53.09.06.2031 | Boradho | — |
| 53.09.06.2032 | Mukuvoka | — |
| 53.09.06.2033 | Ubedolumolo II | — |
| 53.09.06.2034 | Langagedha I | — |
| 53.09.07.2019 | Waepana I | — |
| 53.09.07.2020 | Lokaweka | — |
| 53.09.09.2023 | Kota Raja | — |
| 53.09.09.2024 | Ite Jaya | — |
| 53.09.09.2025 | Wangka Barat | — |
| 53.09.09.2026 | Lengkosambi Tengah | — |
| 53.09.09.2027 | Tadho Timur | — |
| 53.09.09.2028 | Tadho Barat | — |
| 53.09.09.2029 | Tadho Tengah | — |
| 53.09.09.2030 | Sambinasi Tengah | — |
| 53.09.09.2031 | Latung Barat | — |
| 53.09.09.2032 | Rawangkalo I | — |
| 53.09.09.2033 | Rawangkalo II | — |
| 53.09.09.2034 | Wakamanga | — |
| 53.09.09.2035 | Lengkosambi Barat Daya | — |
| 53.09.12.2016 | Wongawea | — |
| 53.09.12.2017 | Bowaru | — |
| 53.09.14.2011 | Benteng Tawa II | — |
| 53.09.14.2012 | Benteng Tawa III | — |
| 53.09.14.2013 | Lanamai II | — |
| 53.09.14.2014 | Kembang | — |
| 53.09.14.2015 | Wate | — |
| 53.09.14.2016 | Ngara I | — |
| 53.09.14.2017 | Benteng Tawa IV | — |
| 53.09.14.2018 | Benteng Tawa V | — |
| 53.09.14.2019 | Nili Waru Sae | — |
| 53.09.15.2012 | Bowado | — |
| 53.09.16.2009 | Larilaki | — |
| 53.09.16.2010 | Mulumese | — |
| 53.09.16.2011 | Turaloa Timur | — |
| 53.09.18.2013 | Bobawa | — |
| 53.09.18.2014 | Were V | — |
| 53.09.18.2015 | Were VI | — |
| 53.09.18.2016 | Kezewea I | — |
| 53.09.18.2017 | Sadha I | — |
| 53.09.18.2018 | Takatunga I | — |
| 53.09.19.2011 | Bopoma | — |
| 53.09.19.2012 | Rakalaba I | — |
| 53.09.19.2013 | Sobo II | — |
| 53.09.20.2011 | Ruto | — |
| 53.09.20.2012 | Enabhara | — |
| 53.09.20.2013 | Nagebaru | — |
| 61.01.10.2012 | Arga Pura | — |
| 61.01.10.2013 | Sapak Hulu Trans | — |
| 61.09.01.2018 | Sempulau Indah | — |
| 61.09.01.2019 | Tigur Jaya | — |
| 61.09.01.2020 | Beringkai Raya | — |
| 61.09.03.2014 | Semerawai | — |
| 61.09.03.2015 | Engkulun Hulu | — |
| 61.09.05.2010 | Sepantak | — |
| 61.09.05.2011 | Melanjan Raya | — |
| 61.12.01.2021 | Sukulanting | — |
| 61.12.01.2022 | Permata Jaya | — |
| 61.12.02.2006 | Padi Jaya | — |
| 61.12.03.2014 | Ampera Raya | — |
| 61.12.09.2014 | Rengas Kapuas | — |
| 61.12.09.2015 | Parit Keladi | — |
| 63.10.04.2027 | Sido Rejo | — |
| 63.10.04.2028 | Beruntung Raya | — |
| 63.10.04.2029 | Barakat Mufakat | — |
| 63.10.04.2030 | Makmur Jaya | — |
| 63.10.06.2013 | Hidayah Makmur | — |
| 63.10.06.2014 | Plajau Mulia | — |
| 63.10.06.2015 | Kupang Berkah Jaya | — |
| 63.10.07.2013 | Karang Nunggal | — |
| 73.15.09.1006 | Samaturue | — |
| 73.22.11.2002 | Salulemo | — |
| 73.24.06.2017 | Arolipu | — |
| 74.02.18.1001 | Uepai | — |
| 74.71.04.1021 | Wundumbatu | — |
| 81.09.04.2016 | Waehotong | — |
| 81.09.06.2011 | Batu Karang | — |
| 82.01.05.2029 | Bobaneigo Madihutu | — |
| 82.01.05.2030 | Tetewang Joronga | — |
| 82.01.05.2031 | Akelamo Cinga-Cinga | — |
| 82.01.05.2032 | Akesahu Madutu | — |
| 82.71.06.1016 | Tongole | — |
| 91.10.13.2003 | Waskey/Tanjung Batu | — |
| 93.04.10.2001 | Komor | — |
| 93.04.18.2004 | Sato Yod | — |
| 93.04.18.2006 | Ero Airo | — |
| 94.02.14.2005 | Ginigom | — |
| 94.02.19.2013 | Anggalo | — |
| 94.03.01.2010 | Oyaigo | — |
| 94.03.01.2013 | Geko | — |
| 94.03.01.2014 | Mugimeketago | — |
| 94.03.01.2015 | Tuamakida | — |
| 94.03.01.2016 | Geibu | — |
| 94.03.01.2018 | Kogekotu | — |
| 94.03.01.2026 | Yagiyo Butu | — |
| 94.03.03.2002 | Agapo | — |
| 94.03.03.2006 | Makidini | — |
| 94.03.04.2005 | Yumauwo | — |
| 94.03.10.2008 | Dabamomaida | — |
| 94.05.13.2001 | Aguit | — |
| 94.05.13.2003 | Molu | — |
| 94.05.13.2004 | Belaba | — |
| 94.05.14.2002 | Bina | — |
| 94.05.16.2003 | Amuleme | — |
| 95.04.07.2003 | Bimbogul | — |
| 95.04.07.2004 | Yugumengga | — |
| 95.04.07.2005 | Wariru | — |
| 95.04.07.2006 | Yugubuk | — |
| 95.04.07.2007 | Akima | — |
| 95.04.07.2008 | Malela | — |
| 95.04.07.2009 | Nakwil | — |
| 95.04.07.2011 | Holandia | — |
| 95.04.07.2012 | Tawi | — |
| 95.04.19.2002 | Kokondao | — |
| 95.04.19.2010 | Gilo | — |
| 95.04.19.2014 | Kanggineri | — |
| 95.04.19.2015 | Wonoluk | — |
| 95.04.19.2020 | Tinoweno | — |
| 95.04.19.2021 | Mololowa | — |
| 95.04.19.2022 | Kunipaga | — |
| 95.04.19.2023 | Kabumanggen | — |
| 95.04.19.2026 | Tomobur | — |
| 95.04.29.2002 | Wari/Taiyeve | — |
| 95.04.29.2004 | Dotori | — |
| 95.04.29.2006 | Kowari | — |
| 95.04.30.2003 | Prawa | — |
| 95.04.30.2004 | Sigou | — |
| 95.04.30.2006 | Warka | — |
| 95.04.30.2007 | Pakare | — |
| 95.04.30.2008 | Tigu | — |
| 95.04.30.2009 | Bire | — |
| 95.04.30.2011 | Vokuyo | — |
| 95.04.35.2005 | Kimugu | — |
| 95.04.35.2006 | Yagagobak | — |
| 95.04.43.2003 | Paba | — |
| 95.04.43.2004 | Ewan | — |
| 95.04.43.2006 | Walelo | — |
| 95.04.43.2009 | Aliduda | — |

## Kode di data koordinat yang tidak ada di Kemendagri 2025 (0)

Tidak ada.

## Kode ganda di data koordinat (0)

Tidak ada.
