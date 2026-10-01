"use client";

import { useState } from "react";
import styles from "./KetentuanUmumBox.module.css";
import KetentuanTeknisModal from "./KetentuanTeknisModal";
import { KETENTUAN_UMUM_ITEMS } from "./data";

// Kotak "Ketentuan umum" + tombol "Baca Ketentuan Teknis" — dipakai bersama
// oleh halaman "Manajemen Koreksi Nilai" (pegawai) dan "Verifikasi Koreksi
// Nilai" (LO Subdit/Admin KKPA) supaya kontennya selalu konsisten.
export default function KetentuanUmumBox({ className }) {
  const [showTeknis, setShowTeknis] = useState(false);

  return (
    <>
      <div className={className ? `${styles.ketentuanBox} ${className}` : styles.ketentuanBox}>
        <div className={styles.ketentuanHeader}>
          <strong>Ketentuan umum :</strong>
          <button
            type="button"
            className={styles.ketentuanTeknisButton}
            onClick={() => setShowTeknis(true)}
          >
            Baca Ketentuan Teknis
          </button>
        </div>
        <ol>
          {KETENTUAN_UMUM_ITEMS.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ol>
      </div>

      <KetentuanTeknisModal open={showTeknis} onClose={() => setShowTeknis(false)} />
    </>
  );
}
