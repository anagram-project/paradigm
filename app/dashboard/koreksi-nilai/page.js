"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import KetentuanUmumBox from "../ketentuanKoreksiNilai/KetentuanUmumBox";

const ROMAN = ["I", "II", "III", "IV"];

// Triwulan pertama sejak fitur Koreksi Nilai dipakai — dijadikan batas bawah
// daftar periode supaya triwulan lama (yang sudah ada datanya) TIDAK PERNAH
// hilang dari pilihan meskipun triwulan berjalan sekarang sudah berganti.
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

// 4 faktor resmi kriteria koreksi nilai, tiap faktor punya 3 slot bukti dukung.
const FAKTOR_DEFS = [
  { id: "1", title: "Kontribusi luar biasa terhadap output strategis organisasi" },
  { id: "2", title: "Prestasi istimewa tingkat nasional/internasional" },
  { id: "3", title: "Konsistensi rela berkorban untuk organisasi" },
  { id: "4", title: "Kualitas kinerja dibanding pegawai selevel" },
];
const NOMOR_LIST = ["1", "2", "3"];

function emptyEntries() {
  const map = {};
  FAKTOR_DEFS.forEach((f) => {
    NOMOR_LIST.forEach((n) => {
      map[`${f.id}-${n}`] = { judul: "", linkFile: "", namaFile: "" };
    });
  });
  return map;
}

export default function KoreksiNilaiPage() {
  const periodeOptions = useMemo(() => generatePeriodeOptions(), []);
  const periodeDefault = useMemo(() => {
    const sekarang = periodeSaatIni();
    const label = formatPeriode(sekarang.year, sekarang.quarter);
    return periodeOptions.includes(label) ? label : periodeOptions[periodeOptions.length - 1];
  }, [periodeOptions]);
  const [periode, setPeriode] = useState(periodeDefault);
  const [entries, setEntries] = useState(emptyEntries());
  const [locked, setLocked] = useState(false);
  const [editingFaktor, setEditingFaktor] = useState({});
  const [savingFaktor, setSavingFaktor] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/koreksi-nilai?periode=${encodeURIComponent(periode)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || "Gagal memuat data." });
          setEntries(emptyEntries());
          setLocked(false);
          return;
        }
        const map = emptyEntries();
        (data.entries || []).forEach((e) => {
          const key = `${e.faktor}-${e.nomorUrut}`;
          if (map[key]) {
            map[key] = { judul: e.judul, linkFile: e.linkFile, namaFile: e.namaFile };
          }
        });
        setEntries(map);
        setLocked(!!data.locked);
        if (data.locked) setEditingFaktor({});
      } catch {
        if (!cancelled) setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [periode]);

  function updateJudul(faktorId, nomor, value) {
    setEntries((prev) => ({
      ...prev,
      [`${faktorId}-${nomor}`]: { ...prev[`${faktorId}-${nomor}`], judul: value },
    }));
  }

  function toggleEdit(faktorId) {
    if (locked) return;
    setEditingFaktor((prev) => ({ ...prev, [faktorId]: !prev[faktorId] }));
  }

  async function handleSimpanFaktor(faktorId) {
    if (locked) return;
    setSavingFaktor((prev) => ({ ...prev, [faktorId]: true }));
    setMessage(null);
    try {
      for (const nomor of NOMOR_LIST) {
        const judul = entries[`${faktorId}-${nomor}`]?.judul?.trim();
        if (!judul) continue; // baris kosong dilewati, tidak wajib semua diisi.
        const res = await fetch("/api/koreksi-nilai/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ periode, faktor: faktorId, nomorUrut: nomor, judul }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || "Gagal menyimpan." });
          setSavingFaktor((prev) => ({ ...prev, [faktorId]: false }));
          return;
        }
      }
      setMessage({ type: "success", text: `Faktor ${faktorId} tersimpan.` });
      setEditingFaktor((prev) => ({ ...prev, [faktorId]: false }));
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setSavingFaktor((prev) => ({ ...prev, [faktorId]: false }));
    }
  }

  async function handleUpload(faktorId, nomor, file) {
    if (!file || locked) return;
    const key = `${faktorId}-${nomor}`;

    if (file.type !== "application/pdf") {
      setMessage({ type: "error", text: "File harus berformat PDF." });
      return;
    }
    if (file.size > 0.5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Ukuran file melebihi 0,5 MB." });
      return;
    }

    setUploadingKey(key);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("periode", periode);
      formData.append("faktor", faktorId);
      formData.append("nomorUrut", nomor);
      formData.append("file", file);

      const res = await fetch("/api/koreksi-nilai/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal mengunggah file." });
        return;
      }
      setEntries((prev) => ({
        ...prev,
        [key]: { ...prev[key], linkFile: data.linkFile, namaFile: data.namaFile },
      }));
      setMessage({ type: "success", text: "File naskah dinas berhasil diunggah." });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleDelete(faktorId, nomor) {
    if (locked) return;
    const key = `${faktorId}-${nomor}`;
    const entry = entries[key];
    if (!entry?.judul && !entry?.linkFile) return; // slot sudah kosong, tidak ada yang dihapus

    const konfirmasi = window.confirm(
      `Hapus Bukti Dukung & No ND ${nomor} pada Faktor ${faktorId}? Judul dan file naskah dinas yang sudah diunggah akan dihapus permanen.`
    );
    if (!konfirmasi) return;

    setDeletingKey(key);
    setMessage(null);
    try {
      const res = await fetch("/api/koreksi-nilai/entry", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periode, faktor: faktorId, nomorUrut: nomor }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menghapus." });
        return;
      }
      setEntries((prev) => ({ ...prev, [key]: { judul: "", linkFile: "", namaFile: "" } }));
      setMessage({ type: "success", text: `Bukti Dukung & No ND ${nomor} pada Faktor ${faktorId} berhasil dihapus.` });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setDeletingKey(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.topRow}>
        <div className={styles.periodeBox}>
          <div className={styles.periodeLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
            Pilih Periode Kinerja
          </div>
          <div className={styles.periodeControls}>
            <select
              className={styles.periodeSelect}
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
            >
              {periodeOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.iconButton}
              title="Muat ulang data periode ini"
              onClick={() => setPeriode((p) => p)}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21v-6h-6M5 3v6h6" />
                <path d="M5 15a7 7 0 0012.9 2.5M19 9a7 7 0 00-12.9-2.5" />
              </svg>
            </button>
          </div>
          <div
            className={`${styles.usulanStatus} ${
              locked ? styles.usulanStatusSudah : styles.usulanStatusBelum
            }`}
          >
            Status Usulan: {locked ? "Sudah Diusulkan LO Subdit" : "Belum Diusulkan LO Subdit"}
          </div>
        </div>

        <KetentuanUmumBox />
      </div>

      {locked && (
        <div className={styles.lockedBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 018 0v3" />
          </svg>
          Data koreksi nilai Anda untuk periode ini sedang dikunci untuk proses verifikasi oleh LO Subdit dan tidak dapat diubah.
        </div>
      )}

      {message && (
        <div
          className={`${styles.statusMessage} ${
            message.type === "success" ? styles.statusSuccess : styles.statusError
          }`}
        >
          {message.text}
        </div>
      )}

      {FAKTOR_DEFS.map((faktor) => {
        const isEditing = !!editingFaktor[faktor.id];
        const isSaving = !!savingFaktor[faktor.id];
        return (
          <div key={faktor.id} className={styles.faktorCard}>
            <div className={styles.faktorActions}>
              <button
                type="button"
                className={styles.iconButton}
                title={locked ? "Data sedang dikunci untuk verifikasi" : "Simpan"}
                onClick={() => handleSimpanFaktor(faktor.id)}
                disabled={isSaving || loading || locked}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <path d="M17 21v-8H7v8M7 3v5h8" />
                </svg>
              </button>
              <button
                type="button"
                className={styles.iconButton}
                title={locked ? "Data sedang dikunci untuk verifikasi" : isEditing ? "Batal edit" : "Edit"}
                onClick={() => toggleEdit(faktor.id)}
                disabled={loading || locked}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            </div>

            <div className={styles.faktorNumber}>
              <div className={styles.faktorNumberBadge}>{faktor.id}</div>
              <div className={styles.faktorTitle}>
                <span>FAKTOR {faktor.id}:</span>
                {faktor.title}
              </div>
            </div>

            <div className={styles.faktorBody}>
              <div className={styles.faktorHeaderRow}>
                <div className={styles.colHeader}>Judul Bukti Dukung &amp; No ND</div>
                <div className={styles.colHeader}>Unggah File Naskah Dinas</div>
              </div>

              {NOMOR_LIST.map((nomor) => {
                const key = `${faktor.id}-${nomor}`;
                const entry = entries[key] || { judul: "", linkFile: "", namaFile: "" };
                const isUploading = uploadingKey === key;
                const isDeleting = deletingKey === key;
                const inputId = `upload-${key}`;

                return (
                  <div key={nomor} className={styles.faktorRow}>
                    <div className={styles.rowItem}>
                      <div className={styles.rowBadge}>{nomor}</div>
                      <input
                        type="text"
                        className={styles.judulInput}
                        placeholder={`Tulis Judul Bukti Dukung & No ND ${nomor} di sini`}
                        value={entry.judul}
                        disabled={!isEditing || loading}
                        onChange={(e) => updateJudul(faktor.id, nomor, e.target.value)}
                      />
                    </div>

                    <div className={styles.uploadRow}>
                      <div className={styles.fileBox}>
                        {entry.linkFile ? (
                          <a href={entry.linkFile} target="_blank" rel="noopener noreferrer">
                            {entry.namaFile || "Lihat file"}
                          </a>
                        ) : (
                          `Judul file naskah dinas ${nomor} akan muncul di sini`
                        )}
                      </div>
                      <input
                        id={inputId}
                        type="file"
                        accept="application/pdf"
                        className={styles.hiddenFileInput}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          handleUpload(faktor.id, nomor, file);
                          e.target.value = "";
                        }}
                      />
                      <label
                        htmlFor={inputId}
                        className={styles.uploadButton}
                        title={locked ? "Data sedang dikunci untuk verifikasi" : "Unggah file PDF"}
                        style={isUploading || locked ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2">
                          <path d="M12 16V4M7 9l5-5 5 5" />
                          <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
                        </svg>
                      </label>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        title={locked ? "Data sedang dikunci untuk verifikasi" : "Hapus bukti dukung ini"}
                        onClick={() => handleDelete(faktor.id, nomor)}
                        disabled={isDeleting || locked || (!entry.judul && !entry.linkFile)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
