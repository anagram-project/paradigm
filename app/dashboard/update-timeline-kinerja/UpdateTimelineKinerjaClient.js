"use client";

import { useEffect, useMemo, useState } from "react";
import { generatePeriodeOptions, periodeDefault } from "@/lib/periodeKinerja";
import styles from "./page.module.css";

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `row-${Date.now()}-${rowIdCounter}`;
}

function emptyEvaluasiRow() {
  return { id: nextRowId(), no: "", kegiatan: "", pihak: "", waktu: "", urgent: false };
}

function emptyManajemenRow() {
  return { id: nextRowId(), no: "", kegiatan: "", keterangan: "", pihak: "", batasWaktu: "", urgent: false };
}

export default function UpdateTimelineKinerjaClient() {
  const periodeOptions = useMemo(() => generatePeriodeOptions(), []);
  const [periode, setPeriode] = useState(() => periodeDefault(periodeOptions));

  const [evaluasiRows, setEvaluasiRows] = useState([]);
  const [manajemenRows, setManajemenRows] = useState([]);
  const [sumber, setSumber] = useState(null); // "bawaan" | "spreadsheet"

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);

  async function loadData(targetPeriode) {
    setLoading(true);
    setLoadError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/timeline?periode=${encodeURIComponent(targetPeriode)}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Gagal memuat data timeline.");
        return;
      }
      setEvaluasiRows(
        (data.evaluasiKinerja || []).map((r) => ({
          id: nextRowId(),
          no: r.no || "",
          kegiatan: r.kegiatan || "",
          pihak: r.pihak || "",
          waktu: r.waktu || "",
          urgent: !!r.urgent,
        }))
      );
      setManajemenRows(
        (data.manajemenKinerja || []).map((r) => ({
          id: nextRowId(),
          no: r.no || "",
          kegiatan: r.kegiatan || "",
          keterangan: r.keterangan || "",
          pihak: r.pihak || "",
          batasWaktu: r.batasWaktu || "",
          urgent: !!r.urgent,
        }))
      );
      setSumber(data.sumber || "spreadsheet");
    } catch {
      setLoadError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(periode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode]);

  function updateEvaluasiRow(id, patch) {
    setEvaluasiRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addEvaluasiRow() {
    setEvaluasiRows((rows) => [...rows, emptyEvaluasiRow()]);
  }
  function removeEvaluasiRow(id) {
    setEvaluasiRows((rows) => rows.filter((r) => r.id !== id));
  }

  function updateManajemenRow(id, patch) {
    setManajemenRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addManajemenRow() {
    setManajemenRows((rows) => [...rows, emptyManajemenRow()]);
  }
  function removeManajemenRow(id) {
    setManajemenRows((rows) => rows.filter((r) => r.id !== id));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/timeline/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode,
          evaluasiKinerja: evaluasiRows.map(({ id, ...rest }) => rest),
          manajemenKinerja: manajemenRows.map(({ id, ...rest }) => rest),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan data timeline." });
        return;
      }
      setMessage({ type: "success", text: `Timeline periode ${periode} berhasil disimpan.` });
      await loadData(periode);
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAll() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Hapus seluruh data timeline untuk periode ${periode}? Tindakan ini tidak bisa dibatalkan.`)
    ) {
      return;
    }
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/timeline/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menghapus data timeline." });
        return;
      }
      setMessage({ type: "success", text: `Data timeline periode ${periode} berhasil dihapus.` });
      await loadData(periode);
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setDeleting(false);
    }
  }

  const busy = loading || saving || deleting;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Pilih Periode</div>
          {sumber && (
            <span
              className={`${styles.sourceTag} ${
                sumber === "bawaan" ? styles.sourceTagBawaan : styles.sourceTagSpreadsheet
              }`}
            >
              {sumber === "bawaan" ? "Data bawaan (belum pernah disimpan)" : "Tersimpan di spreadsheet"}
            </span>
          )}
        </div>
        <p className={styles.hintText}>
          Pilih periode Triwulan yang ingin diperbarui. Perubahan di halaman ini akan langsung tampil ke SELURUH
          pengguna PARADIGMA di menu &quot;Timeline Kinerja Triwulanan&quot; setelah disimpan.
        </p>
        <div className={styles.periodeField}>
          <select
            className={styles.periodeSelect}
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            disabled={busy}
          >
            {periodeOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className={styles.hintText}>Memuat data timeline...</p>
      ) : loadError ? (
        <div className={`${styles.statusMessage} ${styles.statusError}`}>{loadError}</div>
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Timeline Evaluasi Kinerja</div>
            </div>
            <p className={styles.hintText}>
              Isi &quot;No&quot; yang SAMA pada beberapa baris berurutan untuk menggabungkan satu Kegiatan dengan
              beberapa Pihak/Waktu berbeda (seperti pada &quot;Sidang Tim Penilai Kinerja (TPK)&quot;). Centang
              &quot;Urgent&quot; pada SATU baris yang ingin ditonjolkan di kotak peringatan.
            </p>

            {evaluasiRows.length === 0 && (
              <div className={styles.emptyRowsHint}>Belum ada baris. Tambahkan lewat tombol di bawah.</div>
            )}

            {evaluasiRows.map((row) => (
              <div key={row.id} className={styles.rowCard}>
                <div className={styles.rowTopFields}>
                  <div className={`${styles.field} ${styles.noInput}`}>
                    <label className={styles.fieldLabel}>No</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.no}
                      onChange={(e) => updateEvaluasiRow(row.id, { no: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className={styles.field} style={{ flex: 1 }}>
                    <label className={styles.fieldLabel}>Kegiatan</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.kegiatan}
                      onChange={(e) => updateEvaluasiRow(row.id, { kegiatan: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className={styles.rowGrid2}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Pihak</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.pihak}
                      onChange={(e) => updateEvaluasiRow(row.id, { pihak: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Waktu Pelaksanaan</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.waktu}
                      onChange={(e) => updateEvaluasiRow(row.id, { waktu: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className={styles.rowFooter}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={row.urgent}
                      onChange={(e) => updateEvaluasiRow(row.id, { urgent: e.target.checked })}
                      disabled={busy}
                    />
                    Urgent
                  </label>
                  <button
                    type="button"
                    className={styles.removeRowButton}
                    onClick={() => removeEvaluasiRow(row.id)}
                    disabled={busy}
                  >
                    Hapus Baris
                  </button>
                </div>
              </div>
            ))}

            <button type="button" className={styles.addRowButton} onClick={addEvaluasiRow} disabled={busy}>
              + Tambah Baris
            </button>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Timeline Manajemen Kinerja</div>
            </div>
            <p className={styles.hintText}>
              Kegiatan boleh beberapa baris teks (tekan Enter untuk baris baru). Centang &quot;Urgent&quot; pada SATU
              baris yang ingin ditonjolkan di kotak peringatan.
            </p>

            {manajemenRows.length === 0 && (
              <div className={styles.emptyRowsHint}>Belum ada baris. Tambahkan lewat tombol di bawah.</div>
            )}

            {manajemenRows.map((row) => (
              <div key={row.id} className={styles.rowCard}>
                <div className={styles.rowTopFields}>
                  <div className={`${styles.field} ${styles.noInput}`}>
                    <label className={styles.fieldLabel}>No</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.no}
                      onChange={(e) => updateManajemenRow(row.id, { no: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className={styles.field} style={{ flex: 1 }}>
                    <label className={styles.fieldLabel}>Kegiatan</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={row.kegiatan}
                      onChange={(e) => updateManajemenRow(row.id, { kegiatan: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className={styles.rowGrid2}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Keterangan</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.keterangan}
                      onChange={(e) => updateManajemenRow(row.id, { keterangan: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Pihak</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.pihak}
                      onChange={(e) => updateManajemenRow(row.id, { pihak: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Batas Waktu</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={row.batasWaktu}
                      onChange={(e) => updateManajemenRow(row.id, { batasWaktu: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                </div>
                <div className={styles.rowFooter}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={row.urgent}
                      onChange={(e) => updateManajemenRow(row.id, { urgent: e.target.checked })}
                      disabled={busy}
                    />
                    Urgent
                  </label>
                  <button
                    type="button"
                    className={styles.removeRowButton}
                    onClick={() => removeManajemenRow(row.id)}
                    disabled={busy}
                  >
                    Hapus Baris
                  </button>
                </div>
              </div>
            ))}

            <button type="button" className={styles.addRowButton} onClick={addManajemenRow} disabled={busy}>
              + Tambah Baris
            </button>
          </div>

          <div className={styles.card}>
            {message && (
              <div
                className={`${styles.statusMessage} ${
                  message.type === "success" ? styles.statusSuccess : styles.statusError
                }`}
              >
                {message.text}
              </div>
            )}
            <div className={styles.actionsBar}>
              <button type="button" className={styles.saveButton} onClick={handleSave} disabled={busy}>
                {saving ? "Menyimpan..." : `Simpan Timeline ${periode}`}
              </button>
              <button type="button" className={styles.dangerButton} onClick={handleDeleteAll} disabled={busy}>
                {deleting ? "Menghapus..." : "Hapus Semua Data Periode Ini"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
