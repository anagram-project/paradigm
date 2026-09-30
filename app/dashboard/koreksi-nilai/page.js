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

// Isi popup "Ketentuan Teknis": kriteria penambah & pengurang nilai koreksi,
// masing-masing berupa daftar kriteria umum + tabel Faktor Penilaian resmi.
// Murni konten statis (tidak memengaruhi data/API).
const HUKDIS_PERIODE = [
  { tingkat: "Berat", periode: "2 Tahun Terakhir" },
  { tingkat: "Sedang", periode: "1 Tahun Terakhir" },
  { tingkat: "Ringan", periode: "6 Bulan Terakhir" },
];

const KRITERIA_PENAMBAH_LIST = [
  { withTable: true, text: "Tidak Dijatuhi Hukuman Disiplin pada :" },
  {
    text: "Memberikan kontribusi yang luar biasa atas pencapaian kinerja satuan kerja yang menghasilkan output strategis bagi organisasi yang digunakan untuk pemecahan masalah, perbaikan kebijakan, metode, proses kerja, dan/atau optimalisasi pengelolaan keuangan negara,",
  },
  {
    text: "Meraih prestasi yang istimewa dari Kementerian Keuangan dan/atau pihak eksternal di lingkup nasional/internasional atas usahanya yang berdampak langsung untuk kemajuan unit kerja dan organisasi,",
  },
  { text: "Menunjukkan konsistensi dalam tindakan rela berkorban untuk kepentingan organisasi, dan/atau" },
  { text: "kualitas kinerja lebih tinggi dibandingkan dengan para pegawai dalam jenjang jabatan yang sama pada unit kerja." },
];

const KRITERIA_PENGURANGAN_LIST = [
  { withTable: true, text: "Terdapat Hukuman Disiplin pada :" },
  {
    text: "Tingkat kontribusi pegawai atas tercapainya IKI yang dimiliki pegawai bersangkutan (menjadi free rider atau tidak), atau fakta kinerja lebih rendah dari nilai kinerja",
  },
  {
    text: "Adanya keluhan/pengaduan masyarakat/ mitra kerja/pengguna layanan terhadap kinerja/pelayanan/perilaku pegawai bersangkutan dan telah terbukti, dan/atau",
  },
  { text: "Kualitas kinerja lebih rendah dibandingkan dengan para pegawai dalam jenjang jabatan yang sama pada unit kerja." },
];

const KETENTUAN_TEKNIS_PENAMBAH = [
  {
    faktor: "1",
    judul: "Kontribusi Luar Biasa terhadap Output Strategis Organisasi",
    indikator: "Memberikan kontribusi di luar tugas jabatan yang menghasilkan output strategis bagi unit kerja/organisasi",
    kriteria0: "Tidak terdapat kontribusi strategis di luar tugas jabatan",
    kriteria1: "Kontribusi berdampak pada unit kerja",
    kriteria2: "Kontribusi berdampak lintas unit/DJPb/Kementerian Keuangan",
    dokumen: "Output strategis, antara lain Nota Dinas (ND), laporan/kajian/analisis, konsep kebijakan, atau inovasi/perbaikan proses bisnis",
  },
  {
    faktor: "2",
    judul: "Prestasi Istimewa Tingkat Nasional/Internasional",
    indikator: "Memperoleh penghargaan atas kontribusi terhadap organisasi pada tingkat internal, nasional, atau internasional",
    kriteria0: "Tidak ada penghargaan/prestasi yang relevan",
    kriteria1: "Penghargaan tingkat internal Kementerian Keuangan/DJPb dengan dampak langsung bagi unit kerja/organisasi",
    kriteria2: "Penghargaan tingkat nasional/internasional atau dari instansi eksternal yang berdampak pada organisasi",
    dokumen: "Piagam, sertifikat, atau penghargaan resmi dari Kementerian Keuangan maupun pihak eksternal pada level nasional/internasional",
  },
  {
    faktor: "3",
    judul: "Konsistensi Rela Berkorban untuk Organisasi",
    indikator: "Menunjukkan dedikasi di luar tugas formal secara konsisten untuk mendukung kepentingan organisasi",
    kriteria0: "Tidak menunjukkan pola konsisten yang terdokumentasi",
    kriteria1: "Terdapat 1–2 kejadian terdokumentasi dalam periode penilaian",
    kriteria2: "Dilakukan secara konsisten sepanjang periode penilaian dan dapat dibuktikan memberikan dampak bagi organisasi",
    dokumen: "Bukti konsistensi rela berkorban, antara lain ST penugasan khusus, laporan kegiatan, dan bukti kehadiran/presensi di luar jam kerja normal",
  },
  {
    faktor: "4",
    judul: "Kualitas Kinerja Dibanding Pegawai Selevel",
    indikator: "Capaian dan kualitas kinerja dibandingkan dengan pegawai pada jenjang jabatan yang sama",
    kriteria0: "Setara/tidak menonjol dibanding pegawai pada jenjang jabatan yang sama",
    kriteria1: "Sedikit di atas rata-rata dibanding pegawai pada jenjang jabatan yang sama",
    kriteria2: "Signifikan di atas dibanding pegawai pada jenjang jabatan yang sama",
    dokumen: "Penjelasan/analisis perbandingan kinerja yang menunjukkan bahwa kinerja pegawai yang bersangkutan lebih tinggi dibandingkan pegawai selevel, disertai data/bukti pendukung yang relevan",
  },
];

const KETENTUAN_TEKNIS_PENGURANGAN = [
  {
    faktor: "1",
    judul: "Riwayat Hukuman Disiplin",
    indikator: "Riwayat hukuman disiplin dalam periode yang dipersyaratkan",
    kriteria0: "Tidak memiliki riwayat hukuman disiplin",
    kriteria1: "Memiliki riwayat hukuman disiplin ringan/sedang sesuai periode penilaian",
    kriteria2: "Memiliki riwayat hukuman disiplin berat atau pelanggaran disiplin yang berulang",
    dokumen: "Salinan SK Penetapan Hukuman Disiplin",
  },
  {
    faktor: "2",
    judul: "Kontribusi terhadap Pencapaian IKI",
    indikator: "Tingkat kontribusi pegawai terhadap target kinerja unit",
    kriteria0: "Kontribusi sesuai target dan peran, serta tidak terdapat indikasi free rider",
    kriteria1: "Kontribusi di bawah rata-rata atau terdapat indikasi free rider pada sebagian pekerjaan",
    kriteria2: "Kontribusi jauh di bawah ekspektasi atau terbukti menjadi free rider pada sebagian besar pekerjaan",
    dokumen: "Laporan, data, dan/atau testimoni yang menunjukkan indikasi kontribusi minimal (free rider)",
  },
  {
    faktor: "3",
    judul: "Keluhan/Pengaduan yang Terbukti",
    indikator: "Keluhan/pengaduan yang telah ditindaklanjuti dan dinyatakan terbukti",
    kriteria0: "Tidak terdapat keluhan/pengaduan yang terbukti",
    kriteria1: "Terdapat keluhan/pengaduan yang berdampak terbatas terhadap pelayanan",
    kriteria2: "Terdapat keluhan/pengaduan yang berdampak signifikan terhadap pelayanan atau reputasi unit kerja",
    dokumen: "Hasil verifikasi/pemeriksaan dan/atau Berita Acara (BA) atas aduan masyarakat, mitra kerja, dan/atau stakeholder yang telah terbukti",
  },
  {
    faktor: "4",
    judul: "Kualitas Kinerja Dibandingkan Pegawai Selevel",
    indikator: "Perbandingan capaian kinerja dengan pegawai pada jenjang jabatan yang sama",
    kriteria0: "Setara atau lebih tinggi dibandingkan rata-rata pegawai selevel",
    kriteria1: "Sedikit di bawah rata-rata dibandingkan rata-rata pegawai selevel",
    kriteria2: "Signifikan di bawah dibandingkan rata-rata pegawai selevel",
    dokumen: "Penjelasan dan data perbandingan kinerja yang menunjukkan bahwa kinerja pegawai yang bersangkutan lebih rendah dibandingkan pegawai selevel, yang dituangkan dalam BA Sidang TPK",
  },
];

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
  const [locked, setLocked] = useState(false);
  const [editingFaktor, setEditingFaktor] = useState({});
  const [savingFaktor, setSavingFaktor] = useState({});
  const [uploadingKey, setUploadingKey] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [showKetentuanTeknis, setShowKetentuanTeknis] = useState(false);
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

        <div className={styles.ketentuanBox}>
          <div className={styles.ketentuanHeader}>
            <strong>Ketentuan umum :</strong>
            <button
              type="button"
              className={styles.ketentuanTeknisButton}
              onClick={() => setShowKetentuanTeknis(true)}
            >
              Baca Ketentuan Teknis
            </button>
          </div>
          <ol>
            <li>Nilai Koreksi TIDAK Bersifat Wajib dan merupakan hasil keputusan Sidang TPK oleh Pimpinan UPK-Two dan Seluruh Pimpinan UPK-Three.</li>
            <li>Unggah Dokumen Pendukung sesuai &quot;Ketentuan Teknis&quot; yang telah disediakan.</li>
            <li>Dokumen Pendukung/Naskah Dinas hanya dapat digunakan pada 1 periode Triwulan saja.</li>
            <li>Dokumen Pendukung/Naskah Dinas hanya dapat digunakan pada 1 faktor saja.</li>
            <li>File Dokumen Pendukung/Naskah Dinas diunggah format PDF &amp; max size 0,5 MB.</li>
          </ol>
        </div>
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

      {showKetentuanTeknis && (
        <div className={styles.modalOverlay} onClick={() => setShowKetentuanTeknis(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Ketentuan Teknis — Kriteria Koreksi Nilai</div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowKetentuanTeknis(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className={styles.kriteriaColumns}>
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
      )}
    </div>
  );
}
