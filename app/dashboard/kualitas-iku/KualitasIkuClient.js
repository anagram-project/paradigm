"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

// =====================================================================
// Referensi rumus: simulasi ini dibangun berdasarkan materi internal
// "Nilai Kualitas Komitmen Kinerja (K3)" & "Simulasi Penghitungan NKP
// Awal" (KMK Nomor 127 Tahun 2026) yang dikonfirmasi bersama LO Subdit.
// Semua angka contoh pada materi tsb (NHK 105,17 -> kalibrasi 103,87;
// NPK 100,71 -> kalibrasi 100,54; NKP Awal 103,04) sudah dicocokkan
// dengan rumus di bawah ini.
//
// Catatan penting yang BELUM ada rumus resminya di materi yang diterima:
// - Cara persis Nilai Kualitas IKU digabung dengan Bobot Kualitas Target
//   menjadi satu "Nilai K3" -> disepakati dipakai RATA-RATA sederhana.
// - Bobot Kualitas Target untuk IKU BARU (belum ada histori Y-1) -> belum
//   ada aturan baku, sehingga di sini disediakan input manual (default 1).
// - Batas angka pasti tiap pita Bobot Kualitas Target IKU Lama (mis. rasio
//   presisi antar Target Y / Realisasi Y-1 / Target Y-1) tidak dicantumkan
//   pada materi berupa diagram — sehingga LO memilih sendiri pita yang
//   paling sesuai dengan kondisi datanya secara kualitatif.
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
  { value: "maximize", label: "Maximize (semakin besar semakin baik)" },
  { value: "minimize", label: "Minimize (semakin kecil semakin baik)" },
  { value: "stabilize", label: "Stabilize (semakin stabil semakin baik)" },
];

// Skenario A/B tiap polarisasi, beserta 5 pita Bobot Kualitas Target IKU
// Lama-nya (diurutkan dari yang paling menantang / bobot tertinggi).
const TARGET_BANDS = {
  maximize: {
    A: {
      label: "Realisasi Y-1 ≥ Target Y-1 (target tahun lalu tercapai/terlampaui)",
      bands: [
        { value: 1.2, label: "Target Y > Realisasi Y-1 — lebih tinggi dari realisasi tahun lalu (paling menantang)" },
        { value: 1.1, label: "Target Y mendekati Realisasi Y-1, sedikit di bawahnya" },
        { value: 1.0, label: "Target Y berada di tengah antara Realisasi Y-1 dan Target Y-1" },
        { value: 0.9, label: "Target Y mendekati Target Y-1, sedikit di atasnya" },
        { value: 0.8, label: "Target Y ≤ Target Y-1 — sama/lebih rendah dari target tahun lalu (paling tidak menantang)" },
      ],
    },
    B: {
      label: "Realisasi Y-1 < Target Y-1 (target tahun lalu tidak tercapai)",
      bands: [
        { value: 0.8, label: "Target Y ≥ Target Y-1 — tetap/menaikkan target lama yang belum tercapai (paling tidak menantang)" },
        { value: 0.9, label: "Target Y mendekati Target Y-1, sedikit di bawahnya" },
        { value: 1.0, label: "Target Y berada di tengah antara Target Y-1 dan Realisasi Y-1" },
        { value: 1.1, label: "Target Y mendekati Realisasi Y-1, sedikit di atasnya" },
        { value: 1.2, label: "Target Y ≤ Realisasi Y-1 — disesuaikan realistis dengan capaian tahun lalu (paling menantang)" },
      ],
    },
  },
  minimize: {
    A: {
      label: "Realisasi Y-1 ≤ Target Y-1 (target tahun lalu tercapai/terlampaui)",
      bands: [
        { value: 0.8, label: "Target Y ≥ Target Y-1 — sama/lebih tinggi dari target tahun lalu (paling tidak menantang)" },
        { value: 0.9, label: "Target Y mendekati Target Y-1, sedikit di bawahnya" },
        { value: 1.0, label: "Target Y berada di tengah antara Target Y-1 dan Realisasi Y-1" },
        { value: 1.1, label: "Target Y mendekati Realisasi Y-1, sedikit di atasnya" },
        { value: 1.2, label: "Target Y < Realisasi Y-1 — lebih rendah dari realisasi tahun lalu (paling menantang)" },
      ],
    },
    B: {
      label: "Realisasi Y-1 > Target Y-1 (target tahun lalu tidak tercapai)",
      bands: [
        { value: 1.2, label: "Target Y ≤ Realisasi Y-1 — disesuaikan realistis dengan capaian tahun lalu (paling menantang)" },
        { value: 1.1, label: "Target Y mendekati Realisasi Y-1, sedikit di atasnya" },
        { value: 1.0, label: "Target Y berada di tengah antara Realisasi Y-1 dan Target Y-1" },
        { value: 0.9, label: "Target Y mendekati Target Y-1, sedikit di bawahnya" },
        { value: 0.8, label: "Target Y ≥ Target Y-1 — tetap/menaikkan target lama yang belum tercapai (paling tidak menantang)" },
      ],
    },
  },
};

const STABILIZE_CRITERIA = [
  { key: "dariUU", label: "IKU yang targetnya ditetapkan berdasarkan UU" },
  { key: "institusiPublik", label: "IKU dengan target maksimal yang diukur dari hasil penilaian institusi publik minimal setingkat Kementerian" },
  { key: "capaianStabil", label: "IKU dengan kecenderungan capaian stabil 2 tahun berturut-turut (deviasi realisasi vs target 0%–2,5%)" },
];

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

function emptyForm() {
  return {
    namaIki: "",
    validitas: "",
    kendali: "",
    jenisIku: "lama",
    polarisasi: "maximize",
    skenario: "A",
    bandValue: null,
    stabilizeCriteria: { dariUU: false, institusiPublik: false, capaianStabil: false },
    bobotBaruManual: 1,
    mandatory: false,
    indeksCapaian: 100,
    jumlahHari: 91,
  };
}

export default function KualitasIkuClient() {
  const [jabatanScale, setJabatanScale] = useState("lain"); // 'tinggi' | 'lain'
  const [form, setForm] = useState(emptyForm());
  const [ikiList, setIkiList] = useState([]);
  const [npkValues, setNpkValues] = useState(
    CORE_VALUES.reduce((acc, cv) => ({ ...acc, [cv.key]: 100 }), {})
  );

  const nilaiKualitasIku =
    form.validitas && form.kendali ? KUALITAS_IKU_TABLE[form.validitas][form.kendali] : null;

  const bandGroup =
    form.jenisIku === "lama" && (form.polarisasi === "maximize" || form.polarisasi === "minimize")
      ? TARGET_BANDS[form.polarisasi][form.skenario]
      : null;

  let bobotTarget = null;
  if (form.jenisIku === "baru") {
    bobotTarget = Number(form.bobotBaruManual) || 1;
  } else if (form.polarisasi === "stabilize") {
    const anyCriteria = Object.values(form.stabilizeCriteria).some(Boolean);
    bobotTarget = anyCriteria ? 1.2 : 1;
  } else if (bandGroup && form.bandValue != null) {
    bobotTarget = form.bandValue;
  }
  if (bobotTarget != null && form.mandatory) {
    bobotTarget = Math.max(bobotTarget, 1);
  }

  const nilaiK3 =
    nilaiKualitasIku != null && bobotTarget != null ? round2((nilaiKualitasIku + bobotTarget) / 2) : null;

  const canAdd = form.namaIki.trim() && nilaiKualitasIku != null && nilaiK3 != null;

  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleAddIki() {
    if (!canAdd) return;
    setIkiList((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        namaIki: form.namaIki.trim(),
        nilaiKualitasIku,
        bobotTarget,
        nilaiK3,
        indeksCapaian: Number(form.indeksCapaian) || 0,
        jumlahHari: Number(form.jumlahHari) || 0,
      },
    ]);
    setForm(emptyForm());
  }

  function handleDeleteIki(id) {
    setIkiList((prev) => prev.filter((row) => row.id !== id));
  }

  const nhkRows = useMemo(() => {
    const totalHari = ikiList.reduce((sum, r) => sum + r.jumlahHari, 0);
    const withKualitas = ikiList.map((r) => ({
      ...r,
      nilaiKualitasCapaian: r.indeksCapaian * r.nilaiK3,
      bobotWaktu: totalHari > 0 ? r.jumlahHari / totalHari : 0,
    }));
    const withIntermediate = withKualitas.map((r) => ({
      ...r,
      intermediate: r.nilaiK3 * r.bobotWaktu,
    }));
    const sumIntermediate = withIntermediate.reduce((sum, r) => sum + r.intermediate, 0);
    return withIntermediate.map((r) => ({
      ...r,
      bobotTertimbang: sumIntermediate > 0 ? r.intermediate / sumIntermediate : 0,
      kontribusiNHK:
        sumIntermediate > 0 ? r.nilaiKualitasCapaian * (r.intermediate / sumIntermediate) : 0,
    }));
  }, [ikiList]);

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
        Kualitas IKU digabung dengan Bobot Kualitas Target, aturan IKU baru, dan batas angka presisi tiap
        pita target) belum tercantum rumus resminya pada materi yang diterima, sehingga nilai di sini{" "}
        <strong>bersifat perkiraan</strong> — nilai resmi tetap mengacu pada aplikasi manajemen kinerja
        Kemenkeu dan keputusan Tim Penilai Kinerja.
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Skala Jabatan</div>
        <div className={styles.radioRow}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              checked={jabatanScale === "tinggi"}
              onChange={() => setJabatanScale("tinggi")}
            />
            Menteri / Wakil Menteri / JPTM (skala maksimal 120, tanpa kalibrasi)
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              checked={jabatanScale === "lain"}
              onChange={() => setJabatanScale("lain")}
            />
            JPTP, Administrator, Pengawas, JF, Pelaksana (dikalibrasi ke maksimal 115)
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>1. Tambah IKI &amp; Hitung Nilai K3</div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nama IKU / IKI</label>
            <input
              type="text"
              className={styles.textInput}
              placeholder="mis. Persentase penyelesaian laporan tepat waktu"
              value={form.namaIki}
              onChange={(e) => updateForm({ namaIki: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Validitas</label>
            <select
              className={styles.selectInput}
              value={form.validitas}
              onChange={(e) => updateForm({ validitas: e.target.value })}
            >
              <option value="">Pilih validitas</option>
              {VALIDITAS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Kendali</label>
            <select
              className={styles.selectInput}
              value={form.kendali}
              onChange={(e) => updateForm({ kendali: e.target.value })}
            >
              <option value="">Pilih kendali</option>
              {KENDALI_OPTIONS.map((o) => {
                const invalid = form.validitas && KUALITAS_IKU_TABLE[form.validitas][o.value] == null;
                return (
                  <option key={o.value} value={o.value} disabled={invalid}>
                    {o.label}
                    {invalid ? " — tidak berlaku" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {nilaiKualitasIku != null && (
            <div className={styles.resultBadge}>
              Nilai Kualitas IKU: <strong>{nilaiKualitasIku}</strong>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Jenis IKU</label>
            <select
              className={styles.selectInput}
              value={form.jenisIku}
              onChange={(e) => updateForm({ jenisIku: e.target.value, bandValue: null })}
            >
              <option value="lama">IKU Lama (punya histori Target/Realisasi Y-1)</option>
              <option value="baru">IKU Baru (belum ada histori)</option>
            </select>
          </div>

          {form.jenisIku === "lama" && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Polarisasi</label>
              <select
                className={styles.selectInput}
                value={form.polarisasi}
                onChange={(e) => updateForm({ polarisasi: e.target.value, bandValue: null })}
              >
                {POLARISASI_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.jenisIku === "lama" && (form.polarisasi === "maximize" || form.polarisasi === "minimize") && (
            <>
              <div className={styles.fieldWide}>
                <label className={styles.fieldLabel}>Kondisi tahun lalu</label>
                <div className={styles.radioRow}>
                  {["A", "B"].map((sk) => (
                    <label key={sk} className={styles.radioOption}>
                      <input
                        type="radio"
                        checked={form.skenario === sk}
                        onChange={() => updateForm({ skenario: sk, bandValue: null })}
                      />
                      {TARGET_BANDS[form.polarisasi][sk].label}
                    </label>
                  ))}
                </div>
              </div>

              <div className={styles.fieldWide}>
                <label className={styles.fieldLabel}>Posisi Target Y (bobot kualitas target)</label>
                <div className={styles.radioRow}>
                  {bandGroup.bands.map((b) => (
                    <label key={b.value} className={styles.radioOption}>
                      <input
                        type="radio"
                        checked={form.bandValue === b.value}
                        onChange={() => updateForm({ bandValue: b.value })}
                      />
                      {b.label} <strong>(bobot {b.value})</strong>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {form.jenisIku === "lama" && form.polarisasi === "stabilize" && (
            <div className={styles.fieldWide}>
              <label className={styles.fieldLabel}>
                Kriteria khusus (centang salah satu untuk bobot maksimal 1,2 &mdash; kosongkan untuk bobot minimal 1)
              </label>
              <div className={styles.radioRow}>
                {STABILIZE_CRITERIA.map((c) => (
                  <label key={c.key} className={styles.checkboxOption}>
                    <input
                      type="checkbox"
                      checked={form.stabilizeCriteria[c.key]}
                      onChange={(e) =>
                        updateForm({
                          stabilizeCriteria: { ...form.stabilizeCriteria, [c.key]: e.target.checked },
                        })
                      }
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.jenisIku === "baru" && (
            <div className={styles.fieldWide}>
              <div className={styles.hintText}>
                Belum ada aturan resmi untuk bobot kualitas target IKU baru pada materi yang diterima &mdash;
                silakan isi manual (default 1 / netral).
              </div>
              <label className={styles.fieldLabel}>Bobot Kualitas Target (manual)</label>
              <input
                type="number"
                step="0.05"
                min="0.6"
                max="1.2"
                className={styles.numberInput}
                value={form.bobotBaruManual}
                onChange={(e) => updateForm({ bobotBaruManual: e.target.value })}
              />
            </div>
          )}

          <div className={styles.fieldWide}>
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={form.mandatory}
                onChange={(e) => updateForm({ mandatory: e.target.checked })}
              />
              IKU Mandatory dari level Kementerian (bobot kualitas target minimal 1)
            </label>
          </div>

          {bobotTarget != null && (
            <div className={styles.resultBadge}>
              Bobot Kualitas Target: <strong>{bobotTarget}</strong>
            </div>
          )}

          {nilaiK3 != null && (
            <div className={styles.resultBadgeStrong}>
              Nilai K3 (rata-rata): <strong>{nilaiK3}</strong>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Indeks Capaian IKI (maks 120)</label>
            <input
              type="number"
              className={styles.numberInput}
              value={form.indeksCapaian}
              onChange={(e) => updateForm({ indeksCapaian: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Jumlah Hari IKI ini berlaku</label>
            <input
              type="number"
              className={styles.numberInput}
              value={form.jumlahHari}
              onChange={(e) => updateForm({ jumlahHari: e.target.value })}
            />
          </div>
        </div>

        <button type="button" className={styles.addButton} onClick={handleAddIki} disabled={!canAdd}>
          + Tambah ke Tabel IKI
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Tabel IKI &amp; Perhitungan NHK</div>
        {nhkRows.length === 0 ? (
          <div className={styles.hintText}>Belum ada IKI yang ditambahkan.</div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama IKI</th>
                  <th>Indeks Capaian</th>
                  <th>Nilai K3</th>
                  <th>Nilai Kualitas Capaian</th>
                  <th>Jumlah Hari</th>
                  <th>Bobot Waktu</th>
                  <th>Bobot Tertimbang</th>
                  <th>Kontribusi NHK</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {nhkRows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>{r.namaIki}</td>
                    <td>{round2(r.indeksCapaian)}</td>
                    <td>{r.nilaiK3}</td>
                    <td>{round2(r.nilaiKualitasCapaian)}</td>
                    <td>{r.jumlahHari}</td>
                    <td>{round2(r.bobotWaktu)}</td>
                    <td>{round2(r.bobotTertimbang * 100)}%</td>
                    <td>{round2(r.kontribusiNHK)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.deleteRowButton}
                        title="Hapus baris ini"
                        onClick={() => handleDeleteIki(r.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
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

      <div className={styles.card}>
        <div className={styles.cardTitle}>2. Nilai Perilaku Kerja (NPK)</div>
        <div className={styles.hintText}>
          Isi Indeks Capaian per Core Value BerAKHLAK (hasil gabungan penilaian atasan/peers/bawahan, maks 120).
        </div>
        <div className={styles.npkGrid}>
          {CORE_VALUES.map((cv) => (
            <div key={cv.key} className={styles.field}>
              <label className={styles.fieldLabel}>{cv.label}</label>
              <input
                type="number"
                className={styles.numberInput}
                value={npkValues[cv.key]}
                onChange={(e) => setNpkValues((prev) => ({ ...prev, [cv.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className={styles.totalRow}>
          <div>
            Nilai Perilaku Kerja (NPK): <strong>{round2(npk)}</strong>
          </div>
          <div>
            NPK {jabatanScale === "tinggi" ? "(skala 120, tanpa kalibrasi)" : "Kalibrasi 115"}:{" "}
            <strong>{round2(npkFinal)}</strong>
          </div>
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
