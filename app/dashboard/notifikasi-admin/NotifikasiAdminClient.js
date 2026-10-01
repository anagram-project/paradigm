"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

function emptyForm() {
  return { judul: "", isi: "", aktif: true };
}

export default function NotifikasiAdminClient() {
  const [items, setItems] = useState([]);
  const [edits, setEdits] = useState({}); // id -> { judul, isi, aktif }
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState(emptyForm());
  const [busyAdd, setBusyAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadData() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/notifikasi");
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "Gagal memuat daftar notifikasi.");
        return;
      }
      const list = data.notifikasi || [];
      setItems(list);
      const nextEdits = {};
      list.forEach((n) => {
        nextEdits[n.id] = { judul: n.judul, isi: n.isi, aktif: n.aktif };
      });
      setEdits(nextEdits);
    } catch {
      setLoadError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateEdit(id, patch) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function handleAdd() {
    if (!form.judul.trim()) {
      setMessage({ type: "error", text: "Judul notifikasi wajib diisi." });
      return;
    }
    setBusyAdd(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notifikasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menambah notifikasi." });
        return;
      }
      setMessage({ type: "success", text: "Notifikasi baru berhasil ditambahkan." });
      setForm(emptyForm());
      await loadData();
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusyAdd(false);
    }
  }

  async function handleSave(id) {
    const edit = edits[id];
    if (!edit || !edit.judul.trim()) {
      setMessage({ type: "error", text: "Judul notifikasi wajib diisi." });
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notifikasi/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...edit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan perubahan." });
        return;
      }
      setMessage({ type: "success", text: "Perubahan notifikasi berhasil disimpan." });
      await loadData();
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id) {
    if (typeof window !== "undefined" && !window.confirm("Hapus notifikasi ini secara permanen?")) {
      return;
    }
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/notifikasi/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menghapus notifikasi." });
        return;
      }
      setMessage({ type: "success", text: "Notifikasi berhasil dihapus." });
      await loadData();
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Tambah Notifikasi Baru</div>
        <p className={styles.hintText}>
          Notifikasi berstatus Aktif akan tampil ke SELURUH pengguna PARADIGMA lewat ikon lonceng pada header
          (angka di lonceng = jumlah notifikasi aktif saat ini, sama untuk semua pengguna).
        </p>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Judul</label>
          <input
            type="text"
            className={styles.textInput}
            value={form.judul}
            onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
            placeholder="Judul notifikasi"
            disabled={busyAdd}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Isi</label>
          <textarea
            className={styles.textArea}
            value={form.isi}
            onChange={(e) => setForm((f) => ({ ...f, isi: e.target.value }))}
            placeholder="Isi/keterangan notifikasi (opsional)"
            rows={3}
            disabled={busyAdd}
          />
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={form.aktif}
            onChange={(e) => setForm((f) => ({ ...f, aktif: e.target.checked }))}
            disabled={busyAdd}
          />
          Aktifkan sekarang
        </label>

        {message && (
          <div
            className={`${styles.statusMessage} ${
              message.type === "success" ? styles.statusSuccess : styles.statusError
            }`}
          >
            {message.text}
          </div>
        )}

        <button type="button" className={styles.addButton} onClick={handleAdd} disabled={busyAdd}>
          {busyAdd ? "Menyimpan..." : "Tambah Notifikasi"}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Daftar Notifikasi</div>

        {loading && <p className={styles.hintText}>Memuat data...</p>}
        {loadError && <div className={`${styles.statusMessage} ${styles.statusError}`}>{loadError}</div>}
        {!loading && !loadError && items.length === 0 && (
          <p className={styles.hintText}>Belum ada notifikasi. Tambahkan lewat form di atas.</p>
        )}

        {!loading &&
          items.map((n) => {
            const edit = edits[n.id] || { judul: n.judul, isi: n.isi, aktif: n.aktif };
            const busy = busyId === n.id;
            return (
              <div key={n.id} className={styles.notifItem}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Judul</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={edit.judul}
                    onChange={(e) => updateEdit(n.id, { judul: e.target.value })}
                    disabled={busy}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Isi</label>
                  <textarea
                    className={styles.textArea}
                    value={edit.isi}
                    onChange={(e) => updateEdit(n.id, { isi: e.target.value })}
                    rows={2}
                    disabled={busy}
                  />
                </div>
                <div className={styles.notifItemFooter}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={edit.aktif}
                      onChange={(e) => updateEdit(n.id, { aktif: e.target.checked })}
                      disabled={busy}
                    />
                    Aktif
                  </label>
                  <span className={styles.hintTextSmall}>
                    Diubah: {n.diubahPada ? new Date(n.diubahPada).toLocaleString("id-ID") : "-"}
                  </span>
                  <div className={styles.notifItemActions}>
                    <button type="button" className={styles.saveButton} onClick={() => handleSave(n.id)} disabled={busy}>
                      {busy ? "..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      className={styles.deleteNotifButton}
                      onClick={() => handleDelete(n.id)}
                      disabled={busy}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
