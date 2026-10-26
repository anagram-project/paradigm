// Data 6 calon Pegawai Teladan + daftar periode Pemilihan Pegawai Teladan.
// Ganti nilai-nilai KANDIDAT_TELADAN ini tiap pergantian triwulan (dan ganti
// juga 6 poster di public/images/pegawai-teladan/kandidat-*.png kalau ada
// calon baru), lalu daftarkan periode & kandidatnya di
// KANDIDAT_PER_PERIODE/PERIODE_TERLAKSANA di bawah supaya menu "Pemilihan
// Pegawai Teladan" (reguler) dan "Penilaian Pegawai Teladan" (admin) sama-
// sama ikut terbuka untuk periode baru tersebut.

const ROMAN = ["I", "II", "III", "IV"];

// Jangkauan tetap pilihan periode di dropdown kedua menu (reguler &
// admin) — SENGAJA tetap (bukan dihitung dari tanggal hari ini seperti
// lib/periodeKinerja.js), karena siklus Pemilihan Pegawai Teladan
// dimulai dari Triwulan III 2026 dan jadwalnya ditentukan di muka s.d.
// Triwulan IV 2027.
const TELADAN_PERIODE_MULAI = { year: 2026, quarter: 2 }; // index 2 = "III"
const TELADAN_PERIODE_AKHIR = { year: 2027, quarter: 3 }; // index 3 = "IV"

function formatPeriodeTeladan(year, quarter) {
  return `Triwulan ${ROMAN[quarter]} ${year}`;
}

/** Daftar tetap periode Pemilihan/Penilaian Pegawai Teladan: Triwulan III 2026 s.d. Triwulan IV 2027. */
export function listPeriodeTeladan() {
  const mulaiIndex = TELADAN_PERIODE_MULAI.year * 4 + TELADAN_PERIODE_MULAI.quarter;
  const akhirIndex = TELADAN_PERIODE_AKHIR.year * 4 + TELADAN_PERIODE_AKHIR.quarter;
  const options = [];
  for (let idx = mulaiIndex; idx <= akhirIndex; idx++) {
    options.push(formatPeriodeTeladan(Math.floor(idx / 4), idx % 4));
  }
  return options;
}

// Periode default saat halaman pertama dibuka: periode PALING AWAL di
// daftar di atas (bukan triwulan kalender berjalan) — karena itulah satu-
// satunya periode yang pemilihannya sudah benar-benar terlaksana saat fitur
// ini ditambahkan.
export function periodeTeladanDefault() {
  return listPeriodeTeladan()[0];
}

// Catatan field "nip": WAJIB diisi NIP asli tiap calon (dipakai di kolom
// Nominee menu/dokumen cetak "Penilaian Pegawai Teladan" — lihat
// lib/penilaianTeladan.js & lib/generatePenilaianTeladanDocx.js). Masih
// placeholder "" di bawah ini sampai nilainya dikonfirmasi oleh Admin.
export const KANDIDAT_TELADAN = [
  {
    id: "fazlur-rahman",
    namaAsli: "Fazlur Rahman",
    namaPanggilan: "Pak Lurah",
    nip: "",
    subdit: "Subdit PA-I",
    poster: "/images/pegawai-teladan/kandidat-pak-lurah.png",
  },
  {
    id: "silvia-rahmawati",
    namaAsli: "Silvia Rahmawati",
    namaPanggilan: "Mrs. Cipi",
    nip: "",
    subdit: "Subdit PA-III",
    poster: "/images/pegawai-teladan/kandidat-mrs-cipi.png",
  },
  {
    id: "nugraheni-vikri",
    namaAsli: "Nugraheni Vikri",
    namaPanggilan: "Vivi Pearce",
    nip: "",
    subdit: "Subdit PA-II",
    poster: "/images/pegawai-teladan/kandidat-vivi-pearce.png",
  },
  {
    id: "bayu-adi-handoko",
    namaAsli: "Bayu Adi Handoko",
    namaPanggilan: "Bayu Telo",
    nip: "",
    subdit: "Subdit KKPA",
    poster: "/images/pegawai-teladan/kandidat-bayu-telo.png",
  },
  {
    id: "juleon-ranto",
    namaAsli: "Juleon Ranto",
    namaPanggilan: "Jule",
    nip: "",
    subdit: "Subdit APPA",
    poster: "/images/pegawai-teladan/kandidat-jule.png",
  },
  {
    id: "teuku-muhammad-ilham",
    namaAsli: "Teuku Muhammad Ilham",
    namaPanggilan: "Ilham",
    nip: "",
    subdit: "Subdit PA-IV",
    poster: "/images/pegawai-teladan/kandidat-ilham.png",
  },
];

export function kandidatById(id) {
  return KANDIDAT_TELADAN.find((k) => k.id === id) || null;
}

export function isValidKandidatId(id) {
  return KANDIDAT_TELADAN.some((k) => k.id === id);
}

// Pemetaan periode -> daftar kandidat periode tsb. Baru "Triwulan III 2026"
// yang sudah terisi (pemilihan pertama yang benar-benar terlaksana) — kalau
// nanti ada pemilihan baru di periode berikutnya, tambahkan entry baru di
// sini (boleh memakai array KANDIDAT_TELADAN yang sama kalau calonnya tidak
// berubah, atau array kandidat baru kalau ada pergantian calon/poster).
const KANDIDAT_PER_PERIODE = {
  "Triwulan III 2026": KANDIDAT_TELADAN,
};

/** Daftar kandidat untuk satu periode — array kosong kalau periode itu belum punya pemilihan. */
export function kandidatUntukPeriode(periode) {
  return KANDIDAT_PER_PERIODE[periode] || [];
}

/** Apakah periode ini sudah punya pemilihan (kandidat terdaftar)? */
export function periodeTeladanTerlaksana(periode) {
  return kandidatUntukPeriode(periode).length > 0;
}

export function kandidatByIdUntukPeriode(periode, id) {
  return kandidatUntukPeriode(periode).find((k) => k.id === id) || null;
}

export function isValidKandidatIdUntukPeriode(periode, id) {
  return kandidatUntukPeriode(periode).some((k) => k.id === id);
}

// Poster banner utama (yang jadi tombol "scroll ke bagian voting") tiap
// periode yang sudah terlaksana — tambahkan entry baru di sini begitu ada
// poster baru untuk periode berikutnya.
const BANNER_PER_PERIODE = {
  "Triwulan III 2026": "/images/pegawai-teladan-2026-tw3-utama.png",
};

/** Path poster banner untuk satu periode — null kalau belum ada posternya. */
export function bannerUntukPeriode(periode) {
  return BANNER_PER_PERIODE[periode] || null;
}
