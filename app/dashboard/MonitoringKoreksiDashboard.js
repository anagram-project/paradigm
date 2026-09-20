"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const ROMAN = ["I", "II", "III", "IV"];

// Sama persis dengan daftar periode di halaman Manajemen Koreksi Nilai —
// triwulan berjalan + 3 triwulan berikutnya, supaya pilihannya konsisten.
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

export default function MonitoringKoreksiDashboard() {
  const periodeOptions = useMemo(() => generatePeriodeOptions(), []);
  const [periode, setPeriode] = useState(periodeOptions[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard/monitoring-koreksi?periode=${encodeURIComponent(periode)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Gagal memuat data.");
          setData([]);
          return;
        }
        setData(json.data || []);
      } catch {
        if (!cancelled) setError("Tidak bisa terhubung ke server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [periode]);

  return (
    <div className={`${styles.panel} ${styles.panelMonitoring}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2" style={{ verticalAlign: "-3px", marginRight: 6 }}>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Monitoring Dokumentasi Koreksi Nilai
        </span>
        <select className={styles.periodeSelectSmall} value={periode} onChange={(e) => setPeriode(e.target.value)}>
          {periodeOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.monitoringTableWrap}>
        <table className={styles.monitoringTable}>
          <thead>
            <tr>
              <th>Kelompok atau Unit</th>
              <th>Jumlah Pegawai</th>
              <th>Jumlah Pegawai Unggah Bukti Dukung</th>
              <th>% Faktor 1 dari total pegawai</th>
              <th>% Faktor 2 dari total pegawai</th>
              <th>% Faktor 3 dari total pegawai</th>
              <th>% Faktor 4 dari total pegawai</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className={styles.monitoringEmpty}>
                  Memuat data...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className={styles.monitoringEmpty}>
                  {error}
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.monitoringEmpty}>
                  Belum ada data untuk periode ini.
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.kelompok}>
                  <td className={styles.monitoringKelompok}>{row.kelompok}</td>
                  <td>{row.totalPegawai}</td>
                  <td>{row.uploadPegawai}</td>
                  {row.persenFaktor.map((p, i) => (
                    <td key={i}>{p}%</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
