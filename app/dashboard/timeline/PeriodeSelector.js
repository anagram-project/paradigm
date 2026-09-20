"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

const ROMAN = ["I", "II", "III", "IV"];

// Sama seperti daftar periode di halaman lain — triwulan berjalan + 3
// triwulan berikutnya.
function generatePeriodeOptions(jumlah = 4) {
  const now = new Date();
  let q = Math.floor(now.getMonth() / 3);
  let year = now.getFullYear();
  const options = [];
  for (let i = 0; i < jumlah; i++) {
    options.push(`Triwulan ${ROMAN[q]} ${year}`);
    q += 1;
    if (q > 3) {
      q = 0;
      year += 1;
    }
  }
  return options;
}

// Catatan: isi Timeline Evaluasi Kinerja & Timeline Manajemen Kinerja masih
// statis (sama untuk semua periode) — dropdown ini baru mengatur tampilan,
// belum memuat data berbeda per periode.
export default function PeriodeSelector() {
  const periodeOptions = useMemo(() => generatePeriodeOptions(), []);
  const [periode, setPeriode] = useState(periodeOptions[0]);

  return (
    <div className={styles.periodeBar}>
      <div className={styles.periodeBarLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
        Pilih Periode Kinerja
      </div>
      <select className={styles.periodeBarSelect} value={periode} onChange={(e) => setPeriode(e.target.value)}>
        {periodeOptions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
