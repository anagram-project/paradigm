"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

// =====================================================================
// Referensi rumus: simulasi ini dibangun berdasarkan materi internal
// "Nilai Kualitas Komitmen Kinerja (K3)" & "Simulasi Penghitungan NKP
// Awal" (KMK Nomor 127 Tahun 2026) yang dikonfirmasi bersama LO Subdit.
// Semua angka contoh pada materi tsb (NHK 105,17 -> kalibrasi 103,87;
// NPK 100,71 -> kalibrasi 100,54; NKP Awal 103,04) sudah dicocokkan
// dengan rumus di bawah ini — layout tabelnya mengikuti susunan yang
// diminta, tapi rumus & ketentuannya TIDAK diubah dari versi sebelumnya.
//
// Catatan penting yang BELUM ada rumus resminya di materi yang diterima:
// - Cara persis Nilai Kualitas IKU digabung dengan Bobot Kualitas Target
//   menjadi satu "Nilai K3" -> disepakati dipakai RATA-RATA sederhana.
// - Bobot Kualitas Target untuk IKU BARU (belum ada histori Y-1) -> belum
//   ada aturan baku, sehingga di sini disediakan input manual (default 1).
// - Batas angka pasti tiap pita Bobot Kualitas Target IKU Lama (mis. rasio
//   presisi antar Target Y / Realisasi Y-1 / Target Y-1) tidak dicantumkan
//   pada materi berupa diagram — sehingga LO memilih sendiri pita yang
//   paling sesuai dengan kondisi datanya (skenario A/B ditentukan otomatis
//   dari angka Target Y-1 & Realisasi Y-1 yang diisi, tapi pita presisinya
//   tetap dipilih manual).
// - "Indeks Capaian Y" pada tabel 1.B sengaja tetap input manual (tidak
//   diotomatisasi dari Target Y & Real Y) karena rumus & pembulatan
//   resminya tidak tercantum pada materi yang diterima.
// Karena itu, hasil dari halaman ini adalah SIMULASI / alat bantu estimasi,
// bukan nilai resmi. Nilai resmi tetap mengacu pada aplikasi manajemen
// kinerja Kemenkeu dan keputusan Tim Penilai Kinerja.
// =====================================================================

const VALIDITAS_OPTIONS = [
  { value: "exact", label: "Exact (E)" },
  { value: "proxy", label: "Proxy (P)" },
  { value: "activity", label: "Activity (A)" },
];

const KENDALI_OPTIONS = [
  { value: "low", label: "Low (L)" },
  { value: "moderate", label: "Moderate (M)" },
  { value: "high", label: "High (H)" },
];

// Tabel Nilai Kualitas IKU: kombinasi Validitas x Kendali. `null` berarti
// kombinasi tsb tidak berlaku (sesuai sel hitam pada materi).
const KUALITAS_IKU_TABLE = {
  exact: { low: 1.2, moderate: 1.15, high: null },
  proxy: { low: 1.1, moderate: 1, high: 0.9 },
  activity: { low: null, moderate: 0.8, high: 0.6 },
};

const POLARISASI_OPTIONS = [
  { value: "maximize", label: "Maximize" },
  { value: "minimize", label: "Minimize" },
  { value: "stabilize", label: "Stabilize" },
];

// Skenario A/B tiap polarisasi (ditentukan otomatis dari Target Y-1 &
// Realisasi Y-1), beserta 5 pita Bobot Kualitas Target IKU Lama-nya.
const TARGET_BANDS = {
  maximize: {
    A: {
      label: "Realisasi Y-1 ≥ Target Y-1",
      bands: [
        { value: 1.2, label: "Target Y > Real Y-1 (paling menantang)" },
        { value: 1.1, label: "Target Y mendekati Real Y-1 (sedikit di bawah)" },
        { value: 1.0, label: "Target Y di tengah Real Y-1 & Target Y-1" },
        { value: 0.9, label: "Target Y mendekati Target Y-1 (sedikit di atas)" },
        { value: 0.8, label: "Target Y ≤ Target Y-1 (paling tidak menantang)" },
      ],
    },
    B: {
      label: "Realisasi Y-1 < Target Y-1",
      bands: [
        { value: 0.8, label: "Target Y ≥ Target Y-1 (paling tidak menantang)" },
        { value: 0.9, label: "Target Y mendekati Target Y-1 (sedikit di bawah)" },
        { value: 1.0, label: "Target Y di tengah Target Y-1 & Real Y-1" },
        { value: 1.1, label: "Target Y mendekati Real Y-1 (sedikit di atas)" },
        { value: 1.2, label: "Target Y ≤ Real Y-1 (paling menantang)" },
      ],
    },
  },
  minimize: {
    A: {
      label: "Realisasi Y-1 ≤ Target Y-1",
      bands: [
        { value: 0.8, label: "Target Y ≥ Target Y-1 (paling tidak menantang)" },
        { value: 0.9, label: "Target Y mendekati Target Y-1 (sedikit di bawah)" },
        { value: 1.0, label: "Target Y di tengah Target Y-1 & Real Y-1" },
        { value: 1.1, label: "Target Y mendekati Real Y-1 (sedikit di atas)" },
        { value: 1.2, label: "Target Y < Real Y-1 (paling menantang)" },
      ],
    },
    B: {
      label: "Realisasi Y-1 > Target Y-1",
      bands: [
        { value: 1.2, label: "Target Y ≤ Real Y-1 (paling menantang)" },
        { value: 1.1, label: "Target Y mendekati Real Y-1 (sedikit di atas)" },
        { value: 1.0, label: "Target Y di tengah Real Y-1 & Target Y-1" },
        { value: 0.9, label: "Target Y mendekati Target Y-1 (sedikit di bawah)" },
        { value: 0.8, label: "Target Y ≥ Target Y-1 (paling tidak menantang)" },
      ],
    },
  },
};

const CORE_VALUES = [
  { key: "berorientasiPelayanan", label: "Berorientasi Pelayanan" },
  { key: "akuntabel", label: "Akuntabel" },
  { key: "kompeten", label: "Kompeten" },
  { key: "harmonis", label: "Harmonis" },
  { key: "loyal", label: "Loyal" },
  { key: "adaptif", label: "Adaptif" },
  { key: "kolaboratif", label: "Kolaboratif" },
];

function calibrate115(value) {
  if (value <= 100) return value;
  return 100 + ((value - 100) * (115 - 100)) / (120 - 100);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function emptyRow() {
  return {
    id: `${Date.now()}-${Math.random()}`,
    namaIki: "",
    validitas: "",
    kendali: "",
    polarisasi: "maximize",
    jenisHistoris: "lama",
    targetY1: "",
    realY1: "",
    targetY: "",
    realY: "",
    bandValue: null,
    stabilizeMemenuhiKriteria: false,
    mandatory: false,
    bobotBaruManual: 1,
    indeksCapaian: 100,
    jumlahHari: 91,
  };
}

// Menghitung semua nilai turunan (Nilai Kualitas IKU, skenario, Bobot
// Kualitas Target, Nilai K3) dari satu baris IKI.
function computeRow(r) {
  const nilaiKualitasIku = r.validitas && r.kendali ? KUALITAS_IKU_TABLE[r.validitas][r.kendali] : null;

  let skenario = null;
  if (
    r.jenisHistoris === "lama" &&
    (r.polarisasi === "maximize" || r.polarisasi === "minimize") &&
    r.targetY1 !== "" &&
    r.realY1 !== ""
  ) {
    const t1 = Number(r.targetY1);
    const re1 = Number(r.realY1);
    if (r.polarisasi === "maximize") skenario = re1 >= t1 ? "A" : "B";
    else skenario = re1 <= t1 ? "A" : "B";
  }
  const bandOptions = skenario ? TARGET_BANDS[r.polarisasi][skenario].bands : [];

  let bobotTarget = null;
  if (r.jenisHistoris === "baru") {
    bobotTarget = Number(r.bobotBaruManual) || 1;
  } else if (r.polarisasi === "stabilize") {
    bobotTarget = r.stabilizeMemenuhiKriteria ? 1.2 : 1;
  } else if (r.bandValue != null) {
    bobotTarget = r.bandValue;
  }
  if (bobotTarget != null && r.mandatory) {
    bobotTarget = Math.max(bobotTarget, 1);
  }

  const nilaiK3 = nilaiKualitasIku != null && bobotTarget != null ? round2((nilaiKualitasIku + bobotTarget) / 2) : null;

  return { ...r, nilaiKualitasIku, skenario, bandOptions, bobotTarget, nilaiK3 };
}

export default function KualitasIkuClient() {
  const [jabatanScale, setJabatanScale] = useState("lain"); // 'tinggi' | 'lain'
  const [ikiList, setIkiList] = useState([]);
  const [npkValues, setNpkValues] = useState(CORE_VALUES.reduce((acc, cv) => ({ ...acc, [cv.key]: 100 }), {}));

  function updateRow(id, patch) {
    setIkiList((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setIkiList((prev) => [...prev, emptyRow()]);
  }

  function deleteRow(id) {
    setIkiList((prev) => prev.filter((r) => r.id !== id));
  }

  const computedRows = useMemo(() => ikiList.map(computeRow), [ikiList]);

  const nhkRows = useMemo(() => {
    const withK3 = computedRows.filter((r) => r.nilaiK3 != null);
    const totalHari = withK3.reduce((sum, r) => sum + (Number(r.jumlahHari) || 0), 0);
    const withKualitas = withK3.map((r) => ({
      ...r,
      nilaiKualitasCapaian: (Number(r.indeksCapaian) || 0) * r.nilaiK3,
      bobotWaktu: totalHari > 0 ? (Number(r.jumlahHari) || 0) / totalHari : 0,
    }));
    const withIntermediate = withKualitas.map((r) => ({ ...r, intermediate: r.nilaiK3 * r.bobotWaktu }));
    const sumIntermediate = withIntermediate.reduce((sum, r) => sum + r.intermediate, 0);
    return withIntermediate.map((r) => ({
      ...r,
      bobotTertimbang: sumIntermediate > 0 ? r.intermediate / sumIntermediate : 0,
      kontribusiNHK: sumIntermediate > 0 ? r.nilaiKualitasCapaian * (r.intermediate / sumIntermediate) : 0,
    }));
  }, [computedRows]);

  const nhk = nhkRows.reduce((sum, r) => sum + r.kontribusiNHK, 0);
  const nhkFinal = jabatanScale === "tinggi" ? nhk : calibrate115(nhk);

  const npk = CORE_VALUES.reduce((sum, cv) => sum + (Number(npkValues[cv.key]) || 0), 0) / CORE_VALUES.length;
  const npkFinal = jabatanScale === "tinggi" ? npk : calibrate115(npk);

  const nkpAwal = 0.75 * nhkFinal + 0.25 * npkFinal;

  return (
    <div className={styles.wrap}>
      <div className={styles.disclaimerBanner}>
        Halaman ini adalah <strong>simulator/alat bantu estimasi</strong> Nilai K3, NHK, NPK, dan NKP Awal
        berdasarkan pemahaman bersama atas KMK Nomor 127 Tahun 2026. Beberapa detail (cara persis Nilai
        Kualitas IKU digabung dengan Bobot Kualitas Target, aturan IKU baru, batas angka presisi tiap pita
        target, dan rumus Indeks Capaian Y) belum tercantum rumus resminya pada materi yang diterima,
        sehingga nilai di sini <strong>bersifat perkiraan</strong> — nilai resmi tetap mengacu pada aplikasi
        manajemen kinerja Kemenkeu dan keputusan Tim Penilai Kinerja.
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Skala Jabatan</div>
        <div className={styles.radioRow}>
          <label className={styles.radioOption}>
            <input type="radio" checked={jabatanScale === "tinggi"} onChange={() => setJabatanScale("tinggi")} />
            Menteri / Wakil Menteri / JPTM (skala maksimal 120, tanpa kalibrasi)
          </label>
          <label className={styles.radioOption}>
            <input type="radio" checked={jabatanScale === "lain"} onChange={() => setJabatanScale("lain")} />
            JPTP, Administrator, Pengawas, JF, Pelaksana (dikalibrasi ke maksimal 115)
          </label>
        </div>
      </div>

      <div className={styles.sectionBar}>1.A. Tambah IKI &amp; Hitung Nilai K3</div>
      <div className={styles.card}>
        <div className={styles.tableScroll}>
          <table className={styles.editTable}>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama IKU / IKI</th>
                <th>Validitas</th>
                <th>Kendali</th>
                <th>Kualitas KU</th>
                <th>Polarisasi</th>
                <th>Jenis Historis</th>
                <th>Target Y-1</th>
                <th>Real Y-1</th>
                <th>Target Y</th>
                <th>Kualitas Target IKU</th>
                <th>K3</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map((r, i) => {
                const isLama = r.jenisHistoris === "lama";
                const isMaxMin = r.polarisasi === "maximize" || r.polarisasi === "minimize";
                return (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>
                      <input
                        type="text"
                        className={styles.cellInput}
                        style={{ minWidth: 160 }}
                        placeholder="Nama IKI"
                        value={r.namaIki}
                        onChange={(e) => updateRow(r.id, { namaIki: e.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        className={styles.cellSelect}
                        value={r.validitas}
                        onChange={(e) => updateRow(r.id, { validitas: e.target.value })}
                      >
                        <option value="">-</option>
                        {VALIDITAS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={styles.cellSelect}
                        value={r.kendali}
                        onChange={(e) => updateRow(r.id, { kendali: e.target.value })}
                      >
                        <option value="">-</option>
                        {KENDALI_OPTIONS.map((o) => {
                          const invalid = r.validitas && KUALITAS_IKU_TABLE[r.validitas][o.value] == null;
                          return (
                            <option key={o.value} value={o.value} disabled={invalid}>
                              {o.label}
                            </option>
                          );
                        })}
                      </select>
                    </td>
                    <td className={styles.computedCell}>{r.nilaiKualitasIku ?? "-"}</td>
                    <td>
                      <select
                        className={styles.cellSelect}
                        value={r.polarisasi}
                        disabled={!isLama}
                        onChange={(e) => updateRow(r.id, { polarisasi: e.target.value, bandValue: null })}
                      >
                        {POLARISASI_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className={styles.cellSelect}
                        value={r.jenisHistoris}
                        onChange={(e) => updateRow(r.id, { jenisHistoris: e.target.value, bandValue: null })}
                      >
                        <option value="lama">Lama</option>
                        <option value="baru">Baru</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.cellInput}
                        style={{ width: 80 }}
                        disabled={!isLama || !isMaxMin}
                        value={r.targetY1}
                        onChange={(e) => updateRow(r.id, { targetY1: e.target.value, bandValue: null })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.cellInput}
                        style={{ width: 80 }}
                        disabled={!isLama || !isMaxMin}
                        value={r.realY1}
                        onChange={(e) => updateRow(r.id, { realY1: e.target.value, bandValue: null })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.cellInput}
                        style={{ width: 80 }}
                        disabled={r.jenisHistoris === "baru"}
                        value={r.targetY}
                        onChange={(e) => updateRow(r.id, { targetY: e.target.value })}
                      />
                    </td>
                    <td>
                      {r.jenisHistoris === "baru" ? (
                        <input
                          type="number"
                          step="0.05"
                          min="0.6"
                          max="1.2"
                          className={styles.cellInput}
                          style={{ width: 80 }}
                          title="Belum ada aturan resmi untuk IKU baru — isi manual"
                          value={r.bobotBaruManual}
                          onChange={(e) => updateRow(r.id, { bobotBaruManual: e.target.value })}
                        />
                      ) : r.polarisasi === "stabilize" ? (
                        <select
                          className={styles.cellSelect}
                          style={{ minWidth: 170 }}
                          value={r.stabilizeMemenuhiKriteria ? "ya" : "tidak"}
                          onChange={(e) => updateRow(r.id, { stabilizeMemenuhiKriteria: e.target.value === "ya" })}
                        >
                          <option value="tidak">Standar (bobot 1)</option>
                          <option value="ya">Memenuhi kriteria khusus (bobot 1,2)</option>
                        </select>
                      ) : r.skenario ? (
                        <select
                          className={styles.cellSelect}
                          style={{ minWidth: 220 }}
                          value={r.bandValue ?? ""}
                          onChange={(e) => updateRow(r.id, { bandValue: Number(e.target.value) })}
                        >
                          <option value="">Pilih posisi Target Y</option>
                          {r.bandOptions.map((b) => (
                            <option key={b.value} value={b.value} title={b.label}>
                              {b.label} (bobot {b.value})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={styles.hintTextSmall}>Isi Target Y-1 &amp; Real Y-1</span>
                      )}
                      <label className={styles.mandatoryCheck} title="IKU Mandatory dari level Kementerian (bobot minimal 1)">
                        <input
                          type="checkbox"
                          checked={r.mandatory}
                          onChange={(e) => updateRow(r.id, { mandatory: e.target.checked })}
                        />
                        Mandatory
                      </label>
                    </td>
                    <td className={styles.computedCellStrong}>{r.nilaiK3 ?? "-"}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.deleteRowButton}
                        title="Hapus baris ini"
                        onClick={() => deleteRow(r.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button type="button" className={styles.addRowLink} onClick={addRow}>
          + tambah IKU baru
        </button>
      </div>

      <div className={styles.sectionBar}>1.B. Perhitungan NHK &amp; NHK Kalibrasi</div>
      <div className={styles.card}>
        {computedRows.length === 0 ? (
          <div className={styles.hintText}>Belum ada IKI yang ditambahkan pada tabel 1.A.</div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama IKU / IKI</th>
                  <th>Target Y</th>
                  <th>Real Y</th>
                  <th>Indeks Capaian Y</th>
                  <th>Nilai K3</th>
                  <th>Nilai Kualitas Cap.</th>
                  <th>Jumlah Hari</th>
                  <th>Bobot Waktu</th>
                  <th>Bobot Tertimbang</th>
                  <th>NHK</th>
                </tr>
              </thead>
              <tbody>
                {computedRows.map((r, i) => {
                  const withCalc = nhkRows.find((x) => x.id === r.id);
                  return (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.namaIki || <span className={styles.hintTextSmall}>(tanpa nama)</span>}</td>
                      <td>{r.targetY || "-"}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          style={{ width: 70 }}
                          value={r.realY}
                          onChange={(e) => updateRow(r.id, { realY: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          style={{ width: 70 }}
                          value={r.indeksCapaian}
                          onChange={(e) => updateRow(r.id, { indeksCapaian: e.target.value })}
                        />
                      </td>
                      <td>{r.nilaiK3 ?? "-"}</td>
                      <td>{withCalc ? round2(withCalc.nilaiKualitasCapaian) : "-"}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.cellInput}
                          style={{ width: 70 }}
                          value={r.jumlahHari}
                          onChange={(e) => updateRow(r.id, { jumlahHari: e.target.value })}
                        />
                      </td>
                      <td>{withCalc ? round2(withCalc.bobotWaktu) : "-"}</td>
                      <td>{withCalc ? `${round2(withCalc.bobotTertimbang * 100)}%` : "-"}</td>
                      <td>{withCalc ? round2(withCalc.kontribusiNHK) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.totalRow}>
          <div>
            Nilai Hasil Kerja (NHK): <strong>{round2(nhk)}</strong>
          </div>
          <div>
            NHK {jabatanScale === "tinggi" ? "(skala 120, tanpa kalibrasi)" : "Kalibrasi 115"}:{" "}
            <strong>{round2(nhkFinal)}</strong>
          </div>
        </div>
      </div>

      <div className={styles.sectionBar}>2. Perhitungan Nilai Perilaku Kerja (NPK)</div>
      <div className={styles.card}>
        <div className={styles.hintText}>
          Isi Indeks Capaian per Core Value BerAKHLAK (hasil gabungan penilaian atasan/peers/bawahan, maks 120).
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {CORE_VALUES.map((cv) => (
                  <th key={cv.key}>{cv.label}</th>
                ))}
                <th>NPK</th>
                <th>NPK Kalibrasi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {CORE_VALUES.map((cv) => (
                  <td key={cv.key}>
                    <input
                      type="number"
                      className={styles.cellInput}
                      style={{ width: 70 }}
                      value={npkValues[cv.key]}
                      onChange={(e) => setNpkValues((prev) => ({ ...prev, [cv.key]: e.target.value }))}
                    />
                  </td>
                ))}
                <td className={styles.computedCellStrong}>{round2(npk)}</td>
                <td className={styles.computedCellStrong}>{round2(npkFinal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.resultCard}>
        <div className={styles.resultCardLabel}>3. Nilai Kinerja Pegawai (NKP) Awal</div>
        <div className={styles.resultCardFormula}>
          NKP Awal = (75% &times; NHK{jabatanScale === "tinggi" ? "" : " Kalibrasi"}) + (25% &times; NPK
          {jabatanScale === "tinggi" ? "" : " Kalibrasi"})
        </div>
        <div className={styles.resultCardBig}>{round2(nkpAwal)}</div>
        <div className={styles.hintText}>
          NKP Awal belum memperhitungkan Nilai Hukuman Disiplin, Nilai Dampak Pelanggaran Disiplin, Nilai
          Koreksi, maupun penggabungan dengan Nilai Kinerja Organisasi (NKO) sesuai jenjang jabatan.
        </div>
      </div>
    </div>
  );
}
