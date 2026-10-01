"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const ROMAN = ["I", "II", "III", "IV"];

// Triwulan pertama sejak fitur Koreksi Nilai dipakai — dijadikan batas bawah
// daftar periode supaya triwulan lama (yang sudah ada datanya) TIDAK PERNAH
// hilang dari pilihan meskipun triwulan berjalan sekarang sudah berganti.
// Sama persis dengan Manajemen Koreksi Nilai & Verifikasi Koreksi Nilai
// (lihat koreksi-nilai/page.js) supaya daftar periode selalu konsisten di
// Home, Verifikasi Koreksi Nilai, maupun dashboard ini sendiri.
// quarter: 0=Triwulan I, 1=Triwulan II, 2=Triwulan III, 3=Triwulan IV.
const PERIODE_MULAI = { year: 2026, quarter: 2 }; // Triwulan III 2026

function formatPeriode(year, quarter) {
  return `Triwulan ${ROMAN[quarter]} ${year}`;
}

function periodeSaatIni() {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) };
}

// Menghasilkan daftar periode (triwulan), mulai dari PERIODE_MULAI (atau
// triwulan berjalan, mana yang lebih awal) sampai `bufferKeDepan` triwulan
// setelah triwulan berjalan saat ini. Daftar ini hanya BERTAMBAH seiring
// waktu (triwulan baru otomatis muncul di akhir), tidak pernah mengurangi
// triwulan lama dari daftar.
function generatePeriodeOptions(bufferKeDepan = 3) {
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

export default function MonitoringKoreksiDashboard() {
  const periodeOptions = useMemo(() => generatePeriodeOptions(), []);
  const periodeDefault = useMemo(() => {
    const sekarang = periodeSaatIni();
    const label = formatPeriode(sekarang.year, sekarang.quarter);
    return periodeOptions.includes(label) ? label : periodeOptions[periodeOptions.length - 1];
  }, [periodeOptions]);
  const [periode, setPeriode] = useState(periodeDefault);
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
