"use client";

import { useEffect, useMemo, useState } from "react";
import MonitoringKoreksiDashboard from "../MonitoringKoreksiDashboard";
import KetentuanUmumBox from "../ketentuanKoreksiNilai/KetentuanUmumBox";
import styles from "./page.module.css";

const ROMAN = ["I", "II", "III", "IV"];

// Triwulan pertama sejak fitur Koreksi Nilai dipakai — dijadikan batas bawah
// daftar periode supaya triwulan lama (yang sudah ada datanya) TIDAK PERNAH
// hilang dari pilihan meskipun triwulan berjalan sekarang sudah berganti.
// Sama persis dengan Manajemen Koreksi Nilai (lihat koreksi-nilai/page.js)
// supaya daftar periode di kedua halaman selalu konsisten.
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

function emptyFaktorStatus() {
  return { 1: "", 2: "", 3: "", 4: "" };
}

// Kolom "Faktor N Status Verifikasi" di spreadsheet menyimpan teks
// "Disetujui"/"Ditolak"/kosong (lihat lib/koreksiNilai.js) — di sini
// dipetakan ke nilai internal "disetujui"/"ditolak"/"" yang dipakai state.
function normalizeStatus(text) {
  if (text === "Disetujui") return "disetujui";
  if (text === "Ditolak") return "ditolak";
  return "";
}

export default function VerifikasiKoreksiClient() {
  const periodeOptions = useMemo(() => generatePeriodeOptions(), []);
  const periodeDefault = useMemo(() => {
    const sekarang = periodeSaatIni();
    const label = formatPeriode(sekarang.year, sekarang.quarter);
    return periodeOptions.includes(label) ? label : periodeOptions[periodeOptions.length - 1];
  }, [periodeOptions]);
  const [periode, setPeriode] = useState(periodeDefault);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loadingPegawai, setLoadingPegawai] = useState(true);
  const [nip, setNip] = useState("");

  const [entries, setEntries] = useState(emptyEntries());
  const [faktorStatus, setFaktorStatus] = useState(emptyFaktorStatus());
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [togglingLock, setTogglingLock] = useState(false);
  const [verifyingKey, setVerifyingKey] = useState(null); // `${faktorId}-${status}`
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showKetentuan, setShowKetentuan] = useState(false);

  // Edit/hapus/unggah Bukti Dukung oleh LO Subdit/Admin KKPA (menggantikan
  // form yang sebelumnya read-only) — SENGAJA tidak digembok oleh `locked`,
  // karena justru saat data terkunci itulah LO/Admin biasanya melakukan
  // verifikasi & koreksi bukti dukung. Nama pegawai yang sedang dipilih
  // (bukan cuma NIP) diambil dari pegawaiList untuk dikirim ke Drive.
  const [editingFaktor, setEditingFaktor] = useState({});
  const [savingFaktor, setSavingFaktor] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);

  // Muat daftar pegawai sekali di awal, untuk dropdown "Pilih Pegawai".
  useEffect(() => {
    let cancelled = false;
    async function loadPegawai() {
      setLoadingPegawai(true);
      try {
        const res = await fetch("/api/verifikasi-koreksi/pegawai");
        const data = await res.json();
        if (!cancelled && res.ok) setPegawaiList(data.pegawai || []);
      } catch {
        // Diamkan — dropdown akan tampil kosong, pengguna bisa coba lagi.
      } finally {
        if (!cancelled) setLoadingPegawai(false);
      }
    }
    loadPegawai();
    return () => {
      cancelled = true;
    };
  }, []);

  // Muat data bukti dukung + status kunci/verifikasi tiap kali pegawai atau
  // periode yang dipilih berubah.
  useEffect(() => {
    setEditingFaktor({});
    if (!nip) {
      setEntries(emptyEntries());
      setFaktorStatus(emptyFaktorStatus());
      setLocked(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(
          `/api/verifikasi-koreksi/entries?nip=${encodeURIComponent(nip)}&periode=${encodeURIComponent(periode)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setMessage({ type: "error", text: data.error || "Gagal memuat data." });
          setEntries(emptyEntries());
          setFaktorStatus(emptyFaktorStatus());
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

        const fs = emptyFaktorStatus();
        Object.entries(data.faktorStatus || {}).forEach(([f, v]) => {
          fs[f] = normalizeStatus(v);
        });
        setFaktorStatus(fs);
        setLocked(!!data.locked);
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
  }, [nip, periode]);

  async function handleToggleLock() {
    if (!nip) return;
    setTogglingLock(true);
    setMessage(null);
    try {
      const nextLocked = !locked;
      const res = await fetch("/api/verifikasi-koreksi/kunci", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, periode, locked: nextLocked }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal mengubah status kunci." });
        return;
      }
      setLocked(nextLocked);
      setMessage({
        type: "success",
        text: nextLocked
          ? "Data koreksi nilai pegawai ini berhasil dikunci — pegawai tidak dapat mengubahnya lagi."
          : "Kunci koreksi berhasil dibuka kembali.",
      });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setTogglingLock(false);
    }
  }

  async function handleSetStatus(faktorId, status) {
    if (!nip) return;
    // Klik ulang tombol yang sudah aktif = batalkan tandanya.
    const nextStatus = faktorStatus[faktorId] === status ? "" : status;
    const key = `${faktorId}-${status}`;
    setVerifyingKey(key);
    setMessage(null);
    try {
      const res = await fetch("/api/verifikasi-koreksi/faktor-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, periode, faktor: faktorId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan status verifikasi." });
        return;
      }
      setFaktorStatus((prev) => ({ ...prev, [faktorId]: nextStatus }));
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setVerifyingKey(null);
    }
  }

  function updateJudul(faktorId, nomor, value) {
    setEntries((prev) => ({
      ...prev,
      [`${faktorId}-${nomor}`]: { ...prev[`${faktorId}-${nomor}`], judul: value },
    }));
  }

  function toggleEdit(faktorId) {
    if (!nip) return;
    setEditingFaktor((prev) => ({ ...prev, [faktorId]: !prev[faktorId] }));
  }

  async function handleSimpanFaktor(faktorId) {
    if (!nip) return;
    setSavingFaktor((prev) => ({ ...prev, [faktorId]: true }));
    setMessage(null);
    try {
      for (const nomor of NOMOR_LIST) {
        const judul = entries[`${faktorId}-${nomor}`]?.judul?.trim();
        if (!judul) continue; // baris kosong dilewati, tidak wajib semua diisi.
        const res = await fetch("/api/verifikasi-koreksi/text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nip, periode, faktor: faktorId, nomorUrut: nomor, judul }),
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
    if (!file || !nip) return;
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
      formData.append("nip", nip);
      formData.append("periode", periode);
      formData.append("faktor", faktorId);
      formData.append("nomorUrut", nomor);
      formData.append("file", file);

      const res = await fetch("/api/verifikasi-koreksi/upload", { method: "POST", body: formData });
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
    if (!nip) return;
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
      const res = await fetch("/api/verifikasi-koreksi/entry", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, periode, faktor: faktorId, nomorUrut: nomor }),
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
        <div className={styles.topBox}>
          <div className={styles.topLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
              <rect x="3" y="4" width="18" height="17" rx="2" />
              <path d="M3 9h18M8 2v4M16 2v4" />
            </svg>
            Pilih Periode Kinerja
          </div>
          <div className={styles.periodeControls}>
            <select className={styles.periodeSelect} value={periode} onChange={(e) => setPeriode(e.target.value)}>
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
        </div>

        <div className={styles.topBox}>
          <div className={styles.topLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
            </svg>
            Pilih Pegawai yang akan Diverifikasi
          </div>
          <select
            className={styles.pegawaiSelect}
            value={nip}
            onChange={(e) => setNip(e.target.value)}
            disabled={loadingPegawai}
          >
            <option value="">Pilih Pegawai</option>
            {pegawaiList.map((p) => (
              <option key={p.nip} value={p.nip}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className={`${styles.lockBox} ${locked ? styles.lockBoxActive : ""}`}
          onClick={handleToggleLock}
          disabled={!nip || togglingLock || loading}
        >
          <span className={styles.lockIconCircle}>
            {locked ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 018 0" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 018 0v3" />
              </svg>
            )}
          </span>
          {locked ? "Buka Kunci" : "Kunci Koreksi"}
        </button>

        <div className={styles.topBox}>
          <div className={styles.topLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Monitoring Rekam &amp; Verifikasi Koreksi
          </div>
          <button type="button" className={styles.monitoringButton} onClick={() => setShowMonitoring(true)}>
            Buka Monitoring
          </button>
        </div>

        <div className={styles.topBox}>
          <div className={styles.topLabel}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
              <path d="M14.5 3.5l6 6" />
              <path d="M2 21h10" />
              <path d="M5 15l6-6 3 3-6 6z" />
              <path d="M13 9l3-3" />
              <path d="M9 15l-3 3" />
            </svg>
            Ketentuan Koreksi Nilai
          </div>
          <button type="button" className={styles.monitoringButton} onClick={() => setShowKetentuan(true)}>
            Baca Ketentuan
          </button>
        </div>
      </div>

      {!nip && (
        <div className={styles.hintBanner}>
          Pilih pegawai di atas untuk mulai memverifikasi bukti dukung koreksi nilainya.
        </div>
      )}

      {nip && locked && (
        <div className={styles.lockedBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 018 0v3" />
          </svg>
          Data pegawai ini sedang dikunci — pegawai tidak dapat mengubah bukti dukungnya sampai kunci dibuka kembali.
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
        const status = faktorStatus[faktor.id];
        const busy = verifyingKey === `${faktor.id}-disetujui` || verifyingKey === `${faktor.id}-ditolak`;
        const isEditing = !!editingFaktor[faktor.id];
        const isSaving = !!savingFaktor[faktor.id];
        return (
          <div key={faktor.id} className={styles.faktorCard}>
            <div className={styles.faktorActions}>
              <button
                type="button"
                className={styles.iconButton}
                title={!nip ? "Pilih pegawai terlebih dahulu" : "Simpan"}
                onClick={() => handleSimpanFaktor(faktor.id)}
                disabled={!nip || isSaving || loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <path d="M17 21v-8H7v8M7 3v5h8" />
                </svg>
              </button>
              <button
                type="button"
                className={styles.iconButton}
                title={!nip ? "Pilih pegawai terlebih dahulu" : isEditing ? "Batal edit" : "Edit"}
                onClick={() => toggleEdit(faktor.id)}
                disabled={!nip || loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            </div>

            <div className={styles.faktorNumber}>
              <div className={styles.faktorNumberRow}>
                <div className={styles.faktorNumberBadge}>{faktor.id}</div>
                <div className={styles.faktorTitle}>
                  <span>FAKTOR {faktor.id}:</span>
                  {faktor.title}
                </div>
              </div>

              <div className={styles.verifyBox}>
                <div className={styles.verifyLabel}>Verifikasi</div>
                <div className={styles.verifyButtons}>
                  <button
                    type="button"
                    className={`${styles.verifyBtn} ${styles.verifyApprove} ${
                      status === "disetujui" ? styles.verifyBtnActive : ""
                    }`}
                    title="Setujui Faktor ini"
                    onClick={() => handleSetStatus(faktor.id, "disetujui")}
                    disabled={!nip || busy || loading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M4 12l5 5L20 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`${styles.verifyBtn} ${styles.verifyReject} ${
                      status === "ditolak" ? styles.verifyBtnActive : ""
                    }`}
                    title="Tolak Faktor ini"
                    onClick={() => handleSetStatus(faktor.id, "ditolak")}
                    disabled={!nip || busy || loading}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
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
                const inputId = `verifikasi-upload-${key}`;

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
                        title={!nip ? "Pilih pegawai terlebih dahulu" : "Unggah file PDF"}
                        style={isUploading || !nip ? { pointerEvents: "none", opacity: 0.6 } : undefined}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2">
                          <path d="M12 16V4M7 9l5-5 5 5" />
                          <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
                        </svg>
                      </label>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        title={!nip ? "Pilih pegawai terlebih dahulu" : "Hapus bukti dukung ini"}
                        onClick={() => handleDelete(faktor.id, nomor)}
                        disabled={!nip || isDeleting || (!entry.judul && !entry.linkFile)}
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

      {showMonitoring && (
        <div className={styles.modalOverlay} onClick={() => setShowMonitoring(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Monitoring Rekam &amp; Verifikasi Koreksi</div>
              <button type="button" className={styles.modalClose} onClick={() => setShowMonitoring(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <MonitoringKoreksiDashboard />
            </div>
          </div>
        </div>
      )}

      {showKetentuan && (
        <div className={styles.modalOverlay} onClick={() => setShowKetentuan(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Ketentuan Koreksi Nilai</div>
              <button type="button" className={styles.modalClose} onClick={() => setShowKetentuan(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <KetentuanUmumBox />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
