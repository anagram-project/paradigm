"use client";

import { useState } from "react";
import styles from "./KetentuanTeknisModal.module.css";
import {
  HUKDIS_PERIODE,
  KRITERIA_PENAMBAH_LIST,
  KRITERIA_PENGURANGAN_LIST,
  KETENTUAN_TEKNIS_PENAMBAH,
  KETENTUAN_TEKNIS_PENGURANGAN,
} from "./data";

// Popup "Ketentuan Teknis — Kriteria Koreksi Nilai" — dipakai bersama oleh
// halaman "Manajemen Koreksi Nilai" (pegawai) dan "Verifikasi Koreksi Nilai"
// (LO Subdit/Admin KKPA) lewat KetentuanUmumBox.js.
export default function KetentuanTeknisModal({ open, onClose }) {
  // Level zoom konten popup (1 = 100%). Dibatasi 0.7–1.5 supaya tabel tetap
  // terbaca di kedua ujung (tidak kekecilan/pecah layout).
  const [zoom, setZoom] = useState(1);

  function zoomIn() {
    setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 100) / 100));
  }

  function zoomOut() {
    setZoom((z) => Math.max(0.7, Math.round((z - 0.1) * 100) / 100));
  }

  function handleClose() {
    setZoom(1);
    onClose();
  }

  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Ketentuan Teknis — Kriteria Koreksi Nilai</div>
          <div className={styles.modalHeaderActions}>
            <div className={styles.zoomControls}>
              <button
                type="button"
                className={styles.zoomButton}
                onClick={zoomOut}
                disabled={zoom <= 0.7}
                aria-label="Perkecil tampilan"
                title="Perkecil tampilan (Zoom Out)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3M8 11h6" />
                </svg>
              </button>
              <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className={styles.zoomButton}
                onClick={zoomIn}
                disabled={zoom >= 1.5}
                aria-label="Perbesar tampilan"
                title="Perbesar tampilan (Zoom In)"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              className={styles.modalClose}
              onClick={handleClose}
              aria-label="Tutup"
              title="Tutup"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.kriteriaColumns} style={{ zoom }}>
            <div className={`${styles.kriteriaPanel} ${styles.kriteriaPanelTambah}`}>
              <div className={styles.kriteriaPanelHeader}>
                <span className={`${styles.kriteriaPanelIcon} ${styles.kriteriaPanelIconTambah}`}>+</span>
                <span className={styles.kriteriaPanelTitle}>Kriteria Penambah Nilai</span>
              </div>
              <ol className={styles.kriteriaList}>
                {KRITERIA_PENAMBAH_LIST.map((item, idx) => (
                  <li key={idx}>
                    <span className={styles.kriteriaListText}>{item.text}</span>
                    {item.withTable && (
                      <table className={`${styles.hukdisTable} ${styles.hukdisTableTambah}`}>
                        <thead>
                          <tr>
                            <th>Tingkat Hukdis</th>
                            <th>Periode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {HUKDIS_PERIODE.map((row) => (
                            <tr key={row.tingkat}>
                              <td>{row.tingkat}</td>
                              <td>{row.periode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </li>
                ))}
              </ol>

              <div className={styles.tableScroll}>
                <table className={styles.ketentuanTable}>
                  <thead>
                    <tr>
                      <th>Faktor Penilaian</th>
                      <th>Indikator</th>
                      <th>
                        Kriteria 0
                        <br />
                        (Tidak Terpenuhi)
                      </th>
                      <th>
                        Kriteria 1
                        <br />
                        (Terpenuhi Cukup)
                      </th>
                      <th>
                        Kriteria 2
                        <br />
                        (Terpenuhi Signifikan)
                      </th>
                      <th>Dokumen Pendukung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KETENTUAN_TEKNIS_PENAMBAH.map((row) => (
                      <tr key={row.faktor}>
                        <td className={styles.faktorCell}>
                          <strong>Faktor {row.faktor}</strong>
                          <br />
                          {row.judul}
                        </td>
                        <td>{row.indikator}</td>
                        <td>{row.kriteria0}</td>
                        <td>{row.kriteria1}</td>
                        <td>{row.kriteria2}</td>
                        <td>{row.dokumen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={`${styles.kriteriaPanel} ${styles.kriteriaPanelKurang}`}>
              <div className={styles.kriteriaPanelHeader}>
                <span className={`${styles.kriteriaPanelIcon} ${styles.kriteriaPanelIconKurang}`}>&minus;</span>
                <span className={styles.kriteriaPanelTitle}>Kriteria Pengurangan Nilai</span>
              </div>
              <ol className={styles.kriteriaList}>
                {KRITERIA_PENGURANGAN_LIST.map((item, idx) => (
                  <li key={idx}>
                    <span className={styles.kriteriaListText}>{item.text}</span>
                    {item.withTable && (
                      <table className={`${styles.hukdisTable} ${styles.hukdisTableKurang}`}>
                        <thead>
                          <tr>
                            <th>Tingkat Hukdis</th>
                            <th>Periode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {HUKDIS_PERIODE.map((row) => (
                            <tr key={row.tingkat}>
                              <td>{row.tingkat}</td>
                              <td>{row.periode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </li>
                ))}
              </ol>

              <div className={styles.tableScroll}>
                <table className={styles.ketentuanTable}>
                  <thead>
                    <tr>
                      <th>Faktor Penilaian</th>
                      <th>Indikator</th>
                      <th>
                        Kriteria 0
                        <br />
                        (Tidak Terpenuhi)
                      </th>
                      <th>
                        Kriteria 1
                        <br />
                        (Terpenuhi Cukup)
                      </th>
                      <th>
                        Kriteria 2
                        <br />
                        (Terpenuhi Signifikan)
                      </th>
                      <th>Dokumen Pendukung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {KETENTUAN_TEKNIS_PENGURANGAN.map((row) => (
                      <tr key={row.faktor}>
                        <td className={styles.faktorCell}>
                          <strong>Faktor {row.faktor}</strong>
                          <br />
                          {row.judul}
                        </td>
                        <td>{row.indikator}</td>
                        <td>{row.kriteria0}</td>
                        <td>{row.kriteria1}</td>
                        <td>{row.kriteria2}</td>
                        <td>{row.dokumen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
