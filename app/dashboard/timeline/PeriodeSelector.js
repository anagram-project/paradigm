"use client";

import styles from "./page.module.css";

// Komponen terkendali (controlled) murni — daftar periode & periode yang
// sedang aktif datang dari parent (page.js), supaya page.js bisa memakai
// periode yang sama untuk mengambil data lewat /api/timeline.
export default function PeriodeSelector({ options, value, onChange }) {
  return (
    <div className={styles.periodeBar}>
      <div className={styles.periodeBarLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
        Pilih Periode Kinerja
      </div>
      <select className={styles.periodeBarSelect} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );
}
