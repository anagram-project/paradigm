"use client";

import { useEffect, useMemo, useState } from "react";
import { listPeriodeTeladan, periodeTeladanDefault } from "@/lib/teladanKandidat";
import { hitungSkorKandidat, rankByNilaiFinal } from "@/lib/penilaianTeladanSkor";
import styles from "./page.module.css";

const INPUT_FIELDS = ["kerapianBerpakaian", "kepatuhanJamKerja", "nilaiIntegritas", "nilaiKehadiran", "nilaiKinerjaRaw"];

function withSkor(row, voteTertinggi) {
  const skor = hitungSkorKandidat({ ...row, voteTertinggi });
  return { ...row, ...skor };
}

export default function PenilaianTeladanClient() {
  const periodeOptions = useMemo(() => listPeriodeTeladan(), []);
  const [periode, setPeriode] = useState(() => periodeTeladanDefault());

  const [rows, setRows] = useState([]);
  const [voteTertinggi, setVoteTertinggi] = useState(0);
  const [totalPemilih, setTotalPemilih] = useState(0);
  const [belumDibuka, setBelumDibuka] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Pengambilan data MURNI (tidak menyentuh state) — dipakai baik dari efek
  // di bawah maupun dari handleSave (lihat alasan pemisahan ini di komentar
  // efek TeladanVotingClient.js: setState literal langsung di body efek
  // ditandai react-hooks/set-state-in-effect, jadi update state untuk efek
  // ini dilakukan di dalam fungsi async lokal yang dipanggil, bukan inline).
  async function fetchPenilaian(targetPeriode) {
    const res = await fetch(`/api/penilaian-teladan?periode=${encodeURIComponent(targetPeriode)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memuat data penilaian.");
    return data;
  }

  function terapkanData(data) {
    setBelumDibuka(!!data.belumDibuka);
    setVoteTertinggi(data.voteTertinggi || 0);
    setTotalPemilih(data.totalPemilih || 0);
    setRows(Array.isArray(data.rows) ? data.rows : []);
  }

  async function loadData(targetPeriode) {
    setLoading(true);
    setLoadError(null);
    setMessage(null);
    try {
      terapkanData(await fetchPenilaian(targetPeriode));
    } catch (err) {
      setLoadError(err.message || "Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      setMessage(null);
      try {
        const data = await fetchPenilaian(periode);
        if (cancelled) return;
        terapkanData(data);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Tidak bisa terhubung ke server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [periode]);

  // Pratinjau nilai final & peringkat dihitung ulang LANGSUNG di sisi
  // client (lib/penilaianTeladanSkor.js, rumus sama dengan server) tiap
  // Admin mengubah salah satu input — supaya tidak perlu menunggu round-
  // trip ke server untuk melihat dampaknya ke Nilai Final & Peringkat.
  function updateRow(kandidatId, field, rawValue) {
    setMessage(null);
    setRows((prev) => {
      const next = prev.map((r) => (r.kandidatId === kandidatId ? withSkor({ ...r, [field]: rawValue }, voteTertinggi) : r));
      return rankByNilaiFinal(next).sort((a, b) => a.peringkat - b.peringkat);
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/penilaian-teladan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode,
          rows: rows.map((r) => ({
            kandidatId: r.kandidatId,
            nama: r.nama,
            subdit: r.subdit,
            kerapianBerpakaian: r.kerapianBerpakaian,
            kepatuhanJamKerja: r.kepatuhanJamKerja,
            nilaiIntegritas: r.nilaiIntegritas,
            nilaiKehadiran: r.nilaiKehadiran,
            nilaiKinerjaRaw: r.nilaiKinerjaRaw,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan data penilaian." });
        return;
      }
      setMessage({ type: "success", text: `Penilaian Pegawai Teladan periode ${periode} berhasil disimpan.` });
      await loadData(periode);
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setSaving(false);
    }
  }

  // Unduh tabel perhitungan periode yang sedang ditampilkan sebagai dokumen
  // Word (.docx) — mengikuti pola fetch-blob-download yang sama dengan
  // handleDownload di BuatIprClient.js (menu "Buat IPR").
  async function handleDownload() {
    setDownloading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/penilaian-teladan/download?periode=${encodeURIComponent(periode)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal membuat dokumen penilaian.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Penilaian_Pegawai_Teladan_${periode.replace(/\s+/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Gagal membuat dokumen penilaian." });
    } finally {
      setDownloading(false);
    }
  }

  const busy = loading || saving;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Pilih Periode</div>
          {!loading && !belumDibuka && (
            <span className={styles.sourceTag}>
              {totalPemilih} pegawai sudah memilih &middot; vote tertinggi: {voteTertinggi}
            </span>
          )}
        </div>
        <p className={styles.hintText}>
          Format perhitungan mengikuti Form Penilaian Pegawai Teladan Dit PA: 5 komponen berbobot 20 (total 100) —
          Disiplin, Integritas, Kehadiran, Vote Pegawai, dan Nilai Kinerja. Kolom &quot;Jumlah Vote&quot; otomatis
          ditarik dari hasil menu reguler &quot;Pemilihan Pegawai Teladan&quot; dan tidak dapat diubah di sini.
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
        <p className={styles.hintText}>Memuat data penilaian...</p>
      ) : loadError ? (
        <div className={`${styles.statusMessage} ${styles.statusError}`}>{loadError}</div>
      ) : belumDibuka ? (
        <div className={styles.card}>
          <div className={styles.emptyState}>
            Pemilihan Pegawai Teladan untuk periode <b>{periode}</b> belum dibuka, sehingga belum ada kandidat untuk
            dinilai. Tabel penilaian akan otomatis terisi begitu kandidat periode ini didaftarkan di
            <code> lib/teladanKandidat.js</code> dan pemilihannya dibuka di menu reguler.
          </div>
        </div>
      ) : (
        <>
          <div className={`${styles.card} ${styles.tableCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>Tabel Penilaian — {periode}</div>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th rowSpan={2} className={styles.thNominee}>
                      Nominee
                    </th>
                    <th colSpan={3}>a. Disiplin Pegawai</th>
                    <th colSpan={2}>b. Integritas Pegawai</th>
                    <th colSpan={2}>c. Kehadiran Pegawai</th>
                    <th colSpan={2}>d. Vote Pegawai</th>
                    <th colSpan={2}>e. Nilai Kinerja Pegawai</th>
                    <th rowSpan={2}>Nilai Final</th>
                    <th rowSpan={2}>Peringkat</th>
                  </tr>
                  <tr>
                    <th>Kerapian Berpakaian</th>
                    <th>Kepatuhan Jam Kerja</th>
                    <th>Skor</th>
                    <th>Nilai (0-100)</th>
                    <th>Skor</th>
                    <th>Nilai (0-100)</th>
                    <th>Skor</th>
                    <th>Jumlah Vote</th>
                    <th>Skor</th>
                    <th>Nilai Raw (indeks 120)</th>
                    <th>Skor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.kandidatId} className={r.peringkat === 1 ? styles.rowJuara : ""}>
                      <td className={styles.thNominee}>
                        <div className={styles.nomineeName}>{r.nama}</div>
                        <div className={styles.nomineeSub}>
                          {r.namaPanggilan ? `${r.namaPanggilan} — ` : ""}
                          {r.subdit}
                        </div>
                      </td>
                      {INPUT_FIELDS.slice(0, 2).map((field) => (
                        <td key={field}>
                          <input
                            type="number"
                            className={styles.cellInput}
                            value={r[field]}
                            min={0}
                            max={10}
                            step={0.1}
                            disabled={busy}
                            onChange={(e) => updateRow(r.kandidatId, field, e.target.value)}
                          />
                        </td>
                      ))}
                      <td className={styles.skorCell}>{r.skorDisiplin}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={r.nilaiIntegritas}
                          min={0}
                          max={100}
                          step={0.1}
                          disabled={busy}
                          onChange={(e) => updateRow(r.kandidatId, "nilaiIntegritas", e.target.value)}
                        />
                      </td>
                      <td className={styles.skorCell}>{r.skorIntegritas}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={r.nilaiKehadiran}
                          min={0}
                          max={100}
                          step={0.1}
                          disabled={busy}
                          onChange={(e) => updateRow(r.kandidatId, "nilaiKehadiran", e.target.value)}
                        />
                      </td>
                      <td className={styles.skorCell}>{r.skorKehadiran}</td>
                      <td className={styles.readonlyCell}>{r.jumlahVote}</td>
                      <td className={styles.skorCell}>{r.skorVote}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          value={r.nilaiKinerjaRaw}
                          min={0}
                          step={0.01}
                          disabled={busy}
                          onChange={(e) => updateRow(r.kandidatId, "nilaiKinerjaRaw", e.target.value)}
                        />
                      </td>
                      <td className={styles.skorCell}>{r.skorKinerja}</td>
                      <td className={styles.nilaiFinalCell}>{r.nilaiFinal}</td>
                      <td className={styles.peringkatCell}>{r.peringkat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                {saving ? "Menyimpan..." : `Simpan Penilaian ${periode}`}
              </button>
              <button
                type="button"
                className={styles.printButton}
                onClick={handleDownload}
                disabled={busy || downloading}
              >
                {downloading ? "Membuat dokumen..." : "Cetak Perhitungan (.docx)"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
