// Fungsi perhitungan skor Penilaian Pegawai Teladan — murni (tidak ada
// akses Google Sheets/env di sini), supaya aman dipakai dari KEDUA sisi:
// - lib/penilaianTeladan.js (server, diimpor ulang untuk Route Handler)
// - app/dashboard/penilaian-pegawai-teladan/PenilaianTeladanClient.js
//   (Client Component, untuk pratinjau nilai final & peringkat langsung
//   saat Admin mengetik — tanpa perlu round-trip ke server tiap input).
//
// Lihat komentar di lib/penilaianTeladan.js untuk penjelasan rumus & bobot
// (mengikuti format "FINAL_Form_Penilaian_Pegawai_Teladan_Dit_PA_Tahun_2025.xlsx").

function toNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function hitungSkorKandidat({
  kerapianBerpakaian = 0,
  kepatuhanJamKerja = 0,
  nilaiIntegritas = 0,
  nilaiKehadiran = 0,
  nilaiKinerjaRaw = 0,
  jumlahVote = 0,
  voteTertinggi = 0,
}) {
  const skorDisiplin = toNumber(kerapianBerpakaian) + toNumber(kepatuhanJamKerja);
  const skorIntegritas = (toNumber(nilaiIntegritas) / 100) * 20;
  const skorKehadiran = (toNumber(nilaiKehadiran) / 100) * 20;
  const skorVote = voteTertinggi > 0 ? (toNumber(jumlahVote) / voteTertinggi) * 20 : 0;
  const skorKinerja = (toNumber(nilaiKinerjaRaw) / 120) * 20;
  const nilaiFinal = skorDisiplin + skorIntegritas + skorKehadiran + skorVote + skorKinerja;

  return {
    skorDisiplin: round2(skorDisiplin),
    skorIntegritas: round2(skorIntegritas),
    skorKehadiran: round2(skorKehadiran),
    skorVote: round2(skorVote),
    skorKinerja: round2(skorKinerja),
    nilaiFinal: round2(nilaiFinal),
  };
}

/** Memberi "peringkat" per baris berdasarkan nilaiFinal menurun (nilai sama = peringkat sama, gaya RANK.EQ). */
export function rankByNilaiFinal(rows) {
  const sorted = [...rows].sort((a, b) => b.nilaiFinal - a.nilaiFinal);
  return rows.map((row) => {
    const peringkat = sorted.findIndex((r) => r.nilaiFinal === row.nilaiFinal) + 1;
    return { ...row, peringkat };
  });
}
