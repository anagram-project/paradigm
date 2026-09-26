"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function PengaturanClient() {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.onerror = () => setMessage({ type: "error", text: "Gagal membaca file." });
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    if (!csvText.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pengaturan/import-referensi-iki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal mengimpor data." });
        return;
      }
      setMessage({
        type: "success",
        text: `Berhasil mengimpor ${data.totalBaris} baris data untuk ${data.totalPegawai} pegawai ke tab "ReferensiIKI".`,
      });
      setCsvText("");
      setFileName("");
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Impor Data Referensi IKI (Monitoring IPR — Satu Kemenkeu)</div>
        <div className={styles.hintText}>
          Unggah file CSV hasil export dari menu Monitoring IPR di Satu Kemenkeu — format &quot;Realisasi &amp;
          Perilaku&quot; (kolom Nama, NIP, Jabatan, Unit Organisasi, Kode SKP, Kategori IKI, Nama IKI, Target TW
          I-IV, Realisasi TW I-IV, NPK, dan skor 7 aspek BerAKHLAK per triwulan). Data ini menjadi referensi
          otomatis untuk menu &quot;Buat IPR&quot; setiap pegawai (dicocokkan berdasarkan NIP) — mengisi otomatis
          field Capaian pada Hasil Kerja (dari Realisasi) maupun Perilaku Kerja (dari skor BerAKHLAK), yang tetap
          bisa disesuaikan manual oleh masing-masing pegawai. Mengunggah file baru akan{" "}
          <strong>menimpa seluruh data referensi lama</strong> — pastikan file yang diunggah adalah data terbaru
          dan lengkap (seluruh pegawai direktorat), bukan sebagian.
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>File CSV</label>
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className={styles.fileInput} />
          {fileName && <div className={styles.hintTextSmall}>Terpilih: {fileName}</div>}
        </div>

        <button type="button" className={styles.addButton} onClick={handleImport} disabled={busy || !csvText.trim()}>
          {busy ? "Mengimpor..." : "Impor ke ReferensiIKI"}
        </button>

        {message && (
          <div className={`${styles.statusMessage} ${message.type === "success" ? styles.statusSuccess : styles.statusError}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
