"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

const ROMAN = ["I", "II", "III", "IV"];

// Menghasilkan daftar periode (triwulan) mulai dari triwulan berjalan saat
// ini, maju ke depan sebanyak `jumlah` (default 4: triwulan berjalan + 3
// triwulan berikutnya). Daftar ini otomatis bergeser tiap triwulan berganti.
function generatePeriodeOptions(jumlah = 4) {
  const now = new Date();
  let q = Math.floor(now.getMonth() / 3); // 0-3
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
  const [periode, setPeriode] = useState(periodeOptions[0]);
  const [entries, setEntries] = useState(emptyEntries());
  const [editingFaktor, setEditingFaktor] = useState({});
  const [savingFaktor, setSavingFaktor] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
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
    setEditingFaktor((prev) => ({ ...prev, [faktorId]: !prev[faktorId] }));
  }

  async function handleSimpanFaktor(faktorId) {
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
    if (!file) return;
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
        </div>

        <div className={styles.ketentuanBox}>
          <strong>Ketentuan umum :</strong>
          <ol>
            <li>Naskah Dinas yang sudah pernah digunakan pada periode sebelumnya, tidak dapat digunakan kembali.</li>
            <li>File Naskah Dinas diunggah format PDF &amp; max size 0,5 MB.</li>
          </ol>
        </div>
      </div>

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
                title="Simpan"
                onClick={() => handleSimpanFaktor(faktor.id)}
                disabled={isSaving || loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <path d="M17 21v-8H7v8M7 3v5h8" />
                </svg>
              </button>
              <button
                type="button"
                className={styles.iconButton}
                title={isEditing ? "Batal edit" : "Edit"}
                onClick={() => toggleEdit(faktor.id)}
                disabled={loading}
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
                      <label htmlFor={inputId} className={styles.uploadButton} title="Unggah file PDF" style={isUploading ? { pointerEvents: "none", opacity: 0.6 } : undefined}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2">
                          <path d="M12 16V4M7 9l5-5 5 5" />
                          <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
                        </svg>
                      </label>
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
