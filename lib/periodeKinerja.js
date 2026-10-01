// Util daftar periode (Triwulan) yang dipakai bersama oleh:
// - app/dashboard/timeline (halaman publik "Timeline Kinerja Triwulanan", semua role)
// - app/dashboard/update-timeline-kinerja (halaman admin, khusus Admin KKPA)
// Tidak ada import server-only di sini — aman dipakai dari Client Component.

const ROMAN = ["I", "II", "III", "IV"];

// Titik awal periode paling lama yang tetap ditampilkan di dropdown — supaya
// periode lama yang sudah ada datanya (Triwulan II & III 2026) tidak pernah
// hilang dari pilihan walau triwulan kalender berjalan sudah lewat jauh dari
// situ (pola yang sama dipakai di koreksi-nilai, lihat PERIODE_MULAI di sana).
const PERIODE_MULAI = { year: 2026, quarter: 1 }; // Triwulan II 2026

export function periodeSaatIni() {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) };
}

export function formatPeriode(year, quarter) {
  return `Triwulan ${ROMAN[quarter]} ${year}`;
}

/** Daftar periode dari PERIODE_MULAI s.d. triwulan berjalan + buffer ke depan. */
export function generatePeriodeOptions(bufferKeDepan = 3) {
  const sekarang = periodeSaatIni();
  const mulaiIndex = PERIODE_MULAI.year * 4 + PERIODE_MULAI.quarter;
  const sekarangIndex = sekarang.year * 4 + sekarang.quarter;
  const startIndex = Math.min(mulaiIndex, sekarangIndex);
  const endIndex = sekarangIndex + bufferKeDepan;

  const options = [];
  for (let idx = startIndex; idx <= endIndex; idx++) {
    options.push(formatPeriode(Math.floor(idx / 4), idx % 4));
  }
  return options;
}

// Default-nya SENGAJA periode paling awal (bukan triwulan kalender
// berjalan) — karena halaman Timeline Kinerja Triwulanan bersifat referensi
// (bukan form yang harus diisi triwulan ini juga), jadi yang paling masuk
// akal dibuka pertama kali adalah periode yang sudah pasti ada datanya.
export function periodeDefault(periodeOptions) {
  return periodeOptions[0];
}
