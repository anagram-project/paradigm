// Data 6 calon Pegawai Teladan + periode voting yang sedang aktif. Ganti
// nilai-nilai ini tiap pergantian triwulan (dan ganti juga 6 poster di
// public/images/pegawai-teladan/kandidat-*.png kalau ada calon baru).

export const PERIODE_VOTING_AKTIF = "Triwulan III 2026";

export const KANDIDAT_TELADAN = [
  {
    id: "fazlur-rahman",
    namaAsli: "Fazlur Rahman",
    namaPanggilan: "Pak Lurah",
    subdit: "Subdit PA-I",
    poster: "/images/pegawai-teladan/kandidat-pak-lurah.png",
  },
  {
    id: "silvia-rahmawati",
    namaAsli: "Silvia Rahmawati",
    namaPanggilan: "Mrs. Cipi",
    subdit: "Subdit PA-III",
    poster: "/images/pegawai-teladan/kandidat-mrs-cipi.png",
  },
  {
    id: "nugraheni-vikri",
    namaAsli: "Nugraheni Vikri",
    namaPanggilan: "Vivi Pearce",
    subdit: "Subdit PA-II",
    poster: "/images/pegawai-teladan/kandidat-vivi-pearce.png",
  },
  {
    id: "bayu-adi-handoko",
    namaAsli: "Bayu Adi Handoko",
    namaPanggilan: "Bayu Telo",
    subdit: "Subdit KKPA",
    poster: "/images/pegawai-teladan/kandidat-bayu-telo.png",
  },
  {
    id: "juleon-ranto",
    namaAsli: "Juleon Ranto",
    namaPanggilan: "Jule",
    subdit: "Subdit APPA",
    poster: "/images/pegawai-teladan/kandidat-jule.png",
  },
  {
    id: "teuku-muhammad-ilham",
    namaAsli: "Teuku Muhammad Ilham",
    namaPanggilan: "Ilham",
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
