// Konten "Ketentuan Koreksi Nilai" — dipakai bersama oleh halaman
// "Manajemen Koreksi Nilai" (pegawai) dan "Verifikasi Koreksi Nilai"
// (LO Subdit/Admin KKPA), lewat KetentuanUmumBox.js & KetentuanTeknisModal.js
// di folder ini. Disatukan di sini supaya kalau kontennya perlu diperbarui
// lagi, cukup diubah SATU kali dan otomatis konsisten di kedua halaman.

export const KETENTUAN_UMUM_ITEMS = [
  "Nilai Koreksi TIDAK Bersifat Wajib dan merupakan hasil keputusan Sidang TPK oleh Pimpinan UPK-Two dan Seluruh Pimpinan UPK-Three.",
  'Unggah Dokumen Pendukung sesuai "Ketentuan Teknis" yang telah disediakan.',
  "Dokumen Pendukung/Naskah Dinas hanya dapat digunakan pada 1 periode Triwulan saja.",
  "Dokumen Pendukung/Naskah Dinas hanya dapat digunakan pada 1 faktor saja.",
  "File Dokumen Pendukung/Naskah Dinas diunggah format PDF & max size 0,5 MB.",
];

export const HUKDIS_PERIODE = [
  { tingkat: "Berat", periode: "2 Tahun Terakhir" },
  { tingkat: "Sedang", periode: "1 Tahun Terakhir" },
  { tingkat: "Ringan", periode: "6 Bulan Terakhir" },
];

export const KRITERIA_PENAMBAH_LIST = [
  { withTable: true, text: "Tidak Dijatuhi Hukuman Disiplin pada :" },
  {
    text: "Memberikan kontribusi yang luar biasa atas pencapaian kinerja satuan kerja yang menghasilkan output strategis bagi organisasi yang digunakan untuk pemecahan masalah, perbaikan kebijakan, metode, proses kerja, dan/atau optimalisasi pengelolaan keuangan negara,",
  },
  {
    text: "Meraih prestasi yang istimewa dari Kementerian Keuangan dan/atau pihak eksternal di lingkup nasional/internasional atas usahanya yang berdampak langsung untuk kemajuan unit kerja dan organisasi,",
  },
  { text: "Menunjukkan konsistensi dalam tindakan rela berkorban untuk kepentingan organisasi, dan/atau" },
  { text: "kualitas kinerja lebih tinggi dibandingkan dengan para pegawai dalam jenjang jabatan yang sama pada unit kerja." },
];

export const KRITERIA_PENGURANGAN_LIST = [
  { withTable: true, text: "Terdapat Hukuman Disiplin pada :" },
  {
    text: "Tingkat kontribusi pegawai atas tercapainya IKI yang dimiliki pegawai bersangkutan (menjadi free rider atau tidak), atau fakta kinerja lebih rendah dari nilai kinerja",
  },
  {
    text: "Adanya keluhan/pengaduan masyarakat/ mitra kerja/pengguna layanan terhadap kinerja/pelayanan/perilaku pegawai bersangkutan dan telah terbukti, dan/atau",
  },
  { text: "Kualitas kinerja lebih rendah dibandingkan dengan para pegawai dalam jenjang jabatan yang sama pada unit kerja." },
];

export const KETENTUAN_TEKNIS_PENAMBAH = [
  {
    faktor: "1",
    judul: "Kontribusi Luar Biasa terhadap Output Strategis Organisasi",
    indikator: "Memberikan kontribusi di luar tugas jabatan yang menghasilkan output strategis bagi unit kerja/organisasi",
    kriteria0: "Tidak terdapat kontribusi strategis di luar tugas jabatan",
    kriteria1: "Kontribusi berdampak pada unit kerja",
    kriteria2: "Kontribusi berdampak lintas unit/DJPb/Kementerian Keuangan",
    dokumen: "Output strategis, antara lain Nota Dinas (ND), laporan/kajian/analisis, konsep kebijakan, atau inovasi/perbaikan proses bisnis",
  },
  {
    faktor: "2",
    judul: "Prestasi Istimewa Tingkat Nasional/Internasional",
    indikator: "Memperoleh penghargaan atas kontribusi terhadap organisasi pada tingkat internal, nasional, atau internasional",
    kriteria0: "Tidak ada penghargaan/prestasi yang relevan",
    kriteria1: "Penghargaan tingkat internal Kementerian Keuangan/DJPb dengan dampak langsung bagi unit kerja/organisasi",
    kriteria2: "Penghargaan tingkat nasional/internasional atau dari instansi eksternal yang berdampak pada organisasi",
    dokumen: "Piagam, sertifikat, atau penghargaan resmi dari Kementerian Keuangan maupun pihak eksternal pada level nasional/internasional",
  },
  {
    faktor: "3",
    judul: "Konsistensi Rela Berkorban untuk Organisasi",
    indikator: "Menunjukkan dedikasi di luar tugas formal secara konsisten untuk mendukung kepentingan organisasi",
    kriteria0: "Tidak menunjukkan pola konsisten yang terdokumentasi",
    kriteria1: "Terdapat 1–2 kejadian terdokumentasi dalam periode penilaian",
    kriteria2: "Dilakukan secara konsisten sepanjang periode penilaian dan dapat dibuktikan memberikan dampak bagi organisasi",
    dokumen: "Bukti konsistensi rela berkorban, antara lain ST penugasan khusus, laporan kegiatan, dan bukti kehadiran/presensi di luar jam kerja normal",
  },
  {
    faktor: "4",
    judul: "Kualitas Kinerja Dibanding Pegawai Selevel",
    indikator: "Capaian dan kualitas kinerja dibandingkan dengan pegawai pada jenjang jabatan yang sama",
    kriteria0: "Setara/tidak menonjol dibanding pegawai pada jenjang jabatan yang sama",
    kriteria1: "Sedikit di atas rata-rata dibanding pegawai pada jenjang jabatan yang sama",
    kriteria2: "Signifikan di atas dibanding pegawai pada jenjang jabatan yang sama",
    dokumen: "Penjelasan/analisis perbandingan kinerja yang menunjukkan bahwa kinerja pegawai yang bersangkutan lebih tinggi dibandingkan pegawai selevel, disertai data/bukti pendukung yang relevan",
  },
];

export const KETENTUAN_TEKNIS_PENGURANGAN = [
  {
    faktor: "1",
    judul: "Riwayat Hukuman Disiplin",
    indikator: "Riwayat hukuman disiplin dalam periode yang dipersyaratkan",
    kriteria0: "Tidak memiliki riwayat hukuman disiplin",
    kriteria1: "Memiliki riwayat hukuman disiplin ringan/sedang sesuai periode penilaian",
    kriteria2: "Memiliki riwayat hukuman disiplin berat atau pelanggaran disiplin yang berulang",
    dokumen: "Salinan SK Penetapan Hukuman Disiplin",
  },
  {
    faktor: "2",
    judul: "Kontribusi terhadap Pencapaian IKI",
    indikator: "Tingkat kontribusi pegawai terhadap target kinerja unit",
    kriteria0: "Kontribusi sesuai target dan peran, serta tidak terdapat indikasi free rider",
    kriteria1: "Kontribusi di bawah rata-rata atau terdapat indikasi free rider pada sebagian pekerjaan",
    kriteria2: "Kontribusi jauh di bawah ekspektasi atau terbukti menjadi free rider pada sebagian besar pekerjaan",
    dokumen: "Laporan, data, dan/atau testimoni yang menunjukkan indikasi kontribusi minimal (free rider)",
  },
  {
    faktor: "3",
    judul: "Keluhan/Pengaduan yang Terbukti",
    indikator: "Keluhan/pengaduan yang telah ditindaklanjuti dan dinyatakan terbukti",
    kriteria0: "Tidak terdapat keluhan/pengaduan yang terbukti",
    kriteria1: "Terdapat keluhan/pengaduan yang berdampak terbatas terhadap pelayanan",
    kriteria2: "Terdapat keluhan/pengaduan yang berdampak signifikan terhadap pelayanan atau reputasi unit kerja",
    dokumen: "Hasil verifikasi/pemeriksaan dan/atau Berita Acara (BA) atas aduan masyarakat, mitra kerja, dan/atau stakeholder yang telah terbukti",
  },
  {
    faktor: "4",
    judul: "Kualitas Kinerja Dibandingkan Pegawai Selevel",
    indikator: "Perbandingan capaian kinerja dengan pegawai pada jenjang jabatan yang sama",
    kriteria0: "Setara atau lebih tinggi dibandingkan rata-rata pegawai selevel",
    kriteria1: "Sedikit di bawah rata-rata dibandingkan rata-rata pegawai selevel",
    kriteria2: "Signifikan di bawah dibandingkan rata-rata pegawai selevel",
    dokumen: "Penjelasan dan data perbandingan kinerja yang menunjukkan bahwa kinerja pegawai yang bersangkutan lebih rendah dibandingkan pegawai selevel, yang dituangkan dalam BA Sidang TPK",
  },
];
