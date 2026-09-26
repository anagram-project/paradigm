"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

// =====================================================================
// Referensi rumus: simulasi ini dibangun berdasarkan materi internal
// "Nilai Kualitas Komitmen Kinerja (K3)", "Penentuan Bobot Kualitas IKU
// Lama", "Perubahan Ketentuan Jumlah IKU", & "Simulasi Penghitungan NKP
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
// - Diagram "Penentuan Bobot Kualitas IKU Lama" hanya memberi 2 titik
//   acuan (Target Y-1 & Realisasi Y-1) untuk menentukan 5 pita (skenario
//   "baik") atau 3 pita (skenario "meleset") bobot 0,8-1,2. Pembagian
//   pita di ANTARA kedua titik acuan tsb (mis. batas pasti 1,1 vs 1,0)
//   tidak dicantumkan angkanya secara eksplisit, sehingga di sini dibagi
//   rata (proporsional linear) di antara kedua titik acuan tersebut.
// - Rumus Indeks Capaian Y dihitung sederhana = (Realisasi Y / Target Y)
//   x 100, dibulatkan turun ke maksimal 120 sesuai arahan Anda — belum
//   memperhitungkan penyesuaian arah untuk IKU Minimize (rumus resminya
//   tidak tercantum pada materi yang diterima).
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

const KEDUDUKAN_OPTIONS = [
  { value: "pimpinan_upk", label: "Pimpinan UPK" },
  { value: "non_pimpinan_upk", label: "Non Pimpinan UPK" },
];

const JABATAN_SKP_OPTIONS = [
  { value: "ppt_madya", label: "PPT Madya" },
  { value: "ppt_pratama", label: "PPT Pratama dan JF yang bertanggung jawab kepada Pimpinan UPK-One" },
  { value: "administrator", label: "Pejabat Administrator dan JF yang setara" },
  { value: "pengawas", label: "Pejabat Pengawas dan JF yang setara" },
  { value: "pelaksana", label: "Pelaksana dan JF yang setara" },
];

// Batas jumlah IKU sesuai materi "Perubahan Ketentuan Jumlah IKU". Untuk
// Pimpinan UPK, sesuai arahan Anda, dipakai angka tetap 10-20 IKU untuk
// semua jenjang jabatan (tidak mengikuti kolom Pimpinan UPK pada tabel
// aslinya yang berbeda-beda per jenjang / "sesuai jumlah RHK").
const NON_PIMPINAN_LIMITS = {
  ppt_madya: { min: 3, max: 10 },
  ppt_pratama: { min: 3, max: 10 },
  administrator: { min: 3, max: 8 },
  pengawas: { min: 3, max: 7 },
  pelaksana: { min: 3, max: 6 },
};

function getIkuLimits(kedudukan, jabatanSkp) {
  if (kedudukan === "pimpinan_upk") return { min: 10, max: 20 };
  return NON_PIMPINAN_LIMITS[jabatanSkp] || null;
}

function calibrate115(value) {
  if (value <= 100) return value;
  return 100 + ((value - 100) * (115 - 100)) / (120 - 100);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Format angka gaya Indonesia (koma sebagai desimal), mis. 126.89 -> "126,89".
function formatID(n) {
  if (n == null || Number.isNaN(n)) return "-";
  return Number(n).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    indeksCapaian: "",
    jumlahHari: 91,
  };
}

// --- Penentuan otomatis Bobot Kualitas Target IKU Lama (Maximize/Minimize) ---
// Lihat catatan rumus di atas berkas ini soal bagaimana pita di antara
// kedua titik acuan (Target Y-1 & Realisasi Y-1) dibagi.
function computeMaximizeBobot(targetY, targetY1, realY1) {
  const t = Number(targetY);
  const t1 = Number(targetY1);
  const r1 = Number(realY1);
  if (!Number.isFinite(t) || !Number.isFinite(t1) || !Number.isFinite(r1)) return { bobot: null, skenario: null };
  if (r1 >= t1) {
    // Skenario A (5 pita): realisasi tahun lalu tercapai/terlampaui.
    if (t > r1) return { bobot: 1.2, skenario: "A" };
    if (t <= t1) {
      const step = (r1 - t1) / 2 || 1;
      return { bobot: t1 - t <= step ? 0.9 : 0.8, skenario: "A" };
    }
    const mid = (r1 + t1) / 2;
    return { bobot: t > mid ? 1.1 : 1.0, skenario: "A" };
  }
  // Skenario B (3 pita): target tahun lalu tidak tercapai.
  if (t > t1) return { bobot: 1.2, skenario: "B" };
  if (t < r1) return { bobot: 0.8, skenario: "B" };
  return { bobot: 1.0, skenario: "B" };
}

function computeMinimizeBobot(targetY, targetY1, realY1) {
  const t = Number(targetY);
  const t1 = Number(targetY1);
  const r1 = Number(realY1);
  if (!Number.isFinite(t) || !Number.isFinite(t1) || !Number.isFinite(r1)) return { bobot: null, skenario: null };
  if (r1 <= t1) {
    // Skenario A (5 pita): realisasi tahun lalu tercapai/terlampaui.
    if (t >= t1) return { bobot: 0.8, skenario: "A" };
    if (t <= r1) {
      const step = (t1 - r1) / 2 || 1;
      return { bobot: r1 - t <= step ? 1.1 : 1.2, skenario: "A" };
    }
    const mid = (t1 + r1) / 2;
    return { bobot: t > mid ? 0.9 : 1.0, skenario: "A" };
  }
  // Skenario B (3 pita): target tahun lalu tidak tercapai.
  if (t >= r1) return { bobot: 0.8, skenario: "B" };
  if (t < t1) return { bobot: 1.2, skenario: "B" };
  return { bobot: 1.0, skenario: "B" };
}

function computeRow(r) {
  const nilaiKualitasIku = r.validitas && r.kendali ? KUALITAS_IKU_TABLE[r.validitas][r.kendali] : null;

  let bobotTarget = null;
  let skenario = null;

  if (r.jenisHistoris === "baru") {
    // IKU baru (tanpa histori Target/Realisasi Y-1): belum ada aturan resmi
    // di materi yang diterima, sehingga Kualitas Target IKU ditetapkan tetap
    // 1 (netral) dan tidak dibuat sebagai isian manual.
    bobotTarget = 1;
  } else if (r.polarisasi === "stabilize") {
    bobotTarget = r.stabilizeMemenuhiKriteria ? 1.2 : 1;
  } else if (r.targetY1 !== "" && r.realY1 !== "" && r.targetY !== "") {
    const fn = r.polarisasi === "maximize" ? computeMaximizeBobot : computeMinimizeBobot;
    const res = fn(r.targetY, r.targetY1, r.realY1);
    bobotTarget = res.bobot;
    skenario = res.skenario;
  }

  if (bobotTarget != null && r.mandatory) {
    bobotTarget = Math.max(bobotTarget, 1);
  }

  const nilaiK3 = nilaiKualitasIku != null && bobotTarget != null ? round2((nilaiKualitasIku + bobotTarget) / 2) : null;

  // Indeks Capaian Y = (Realisasi Y / Target Y) x 100, dibulatkan maks 120.
  const ty = Number(r.targetY);
  const ry = Number(r.realY);
  let indeksCapaianY = null;
  if (Number.isFinite(ty) && ty > 0 && Number.isFinite(ry)) {
    indeksCapaianY = Math.min(120, round2((ry / ty) * 100));
  }

  return { ...r, nilaiKualitasIku, bobotTarget, skenario, nilaiK3, indeksCapaianY };
}

export default function KualitasIkuClient() {
  // --- Wizard: nama proyek -> jabatan pemilik SKP -> simulasi ---
  const [projectName, setProjectName] = useState("");
  const [projectSaved, setProjectSaved] = useState(false);
  const [jabatanConfirmed, setJabatanConfirmed] = useState(false);
  const [kedudukan, setKedudukan] = useState("");
  const [jabatanSkp, setJabatanSkp] = useState("");

  const [projectList, setProjectList] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedExisting, setSelectedExisting] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfContentRef = useRef(null);

  const [jabatanScale, setJabatanScale] = useState("lain"); // 'tinggi' | 'lain'
  const [ikiList, setIkiList] = useState([]);
  const [npkValues, setNpkValues] = useState(
    ["berorientasiPelayanan", "akuntabel", "kompeten", "harmonis", "loyal", "adaptif", "kolaboratif"].reduce(
      (acc, k) => ({ ...acc, [k]: 100 }),
      {}
    )
  );

  const CORE_VALUES = [
    { key: "berorientasiPelayanan", label: "Berorientasi Pelayanan" },
    { key: "akuntabel", label: "Akuntabel" },
    { key: "kompeten", label: "Kompeten" },
    { key: "harmonis", label: "Harmonis" },
    { key: "loyal", label: "Loyal" },
    { key: "adaptif", label: "Adaptif" },
    { key: "kolaboratif", label: "Kolaboratif" },
  ];

  useEffect(() => {
    let cancelled = false;
    async function loadList() {
      setLoadingProjects(true);
      try {
        const res = await fetch("/api/kualitas-iku/list");
        const data = await res.json();
        if (!cancelled && res.ok) setProjectList(data.projects || []);
      } catch {
        // diamkan, dropdown akan tampil kosong
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    }
    loadList();
    return () => {
      cancelled = true;
    };
  }, []);

  const limits = getIkuLimits(kedudukan, jabatanSkp);

  async function handleCreateProject() {
    if (!projectName.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/kualitas-iku/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName.trim(),
          kedudukan: "",
          jabatanSkp: "",
          jabatanScale,
          minIku: "",
          maxIku: "",
          ikiList: [],
          npkValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan proyek." });
        return;
      }
      setProjectSaved(true);
      setMessage({ type: "success", text: `Proyek "${projectName.trim()}" berhasil dibuat & disimpan.` });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadExisting() {
    if (!selectedExisting) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/kualitas-iku/load?project=${encodeURIComponent(selectedExisting)}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal memuat proyek." });
        return;
      }
      const p = data.data;
      setProjectName(p.projectName);
      setKedudukan(p.kedudukan || "");
      setJabatanSkp(p.jabatanSkp || "");
      setJabatanScale(p.jabatanScale || "lain");
      setIkiList(p.ikiList || []);
      setNpkValues((prev) => ({ ...prev, ...p.npkValues }));
      setProjectSaved(true);
      setJabatanConfirmed(!!(p.kedudukan && p.jabatanSkp));
      setMessage({ type: "success", text: `Proyek "${p.projectName}" berhasil dimuat.` });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmJabatan() {
    if (!kedudukan || !jabatanSkp) return;
    setBusy(true);
    setMessage(null);
    try {
      const lim = getIkuLimits(kedudukan, jabatanSkp);
      const res = await fetch("/api/kualitas-iku/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          kedudukan,
          jabatanSkp,
          jabatanScale,
          minIku: lim?.min ?? "",
          maxIku: lim?.max ?? "",
          ikiList,
          npkValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan." });
        return;
      }
      setJabatanConfirmed(true);
      setMessage(null);
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProgress() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/kualitas-iku/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          kedudukan,
          jabatanSkp,
          jabatanScale,
          minIku: limits?.min ?? "",
          maxIku: limits?.max ?? "",
          ikiList,
          npkValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan." });
        return;
      }
      setMessage({ type: "success", text: "Perubahan berhasil disimpan." });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadPdf() {
    const node = pdfContentRef.current;
    if (!node) return;
    setPdfBusy(true);
    setMessage(null);
    // Beberapa tabel di halaman ini punya scroll horizontal (overflow-x)
    // supaya muat di layar — untuk PDF, semua kolom harus tampak penuh,
    // jadi overflow-nya dibuka sementara khusus saat pengambilan gambar.
    const scrollers = Array.from(node.querySelectorAll(`.${styles.tableScroll}`));
    const prevOverflow = scrollers.map((el) => el.style.overflowX);
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const { jsPDF } = jsPdfModule;

      scrollers.forEach((el) => {
        el.style.overflowX = "visible";
      });

      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: node.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = (projectName || "simulasi-k3").trim().replace(/[^\w\-]+/g, "_") || "simulasi-k3";
      pdf.save(`${safeName}-simulasi-k3.pdf`);
    } catch (err) {
      setMessage({ type: "error", text: "Gagal membuat PDF: " + (err?.message || "terjadi kesalahan.") });
    } finally {
      scrollers.forEach((el, i) => {
        el.style.overflowX = prevOverflow[i];
      });
      setPdfBusy(false);
    }
  }

  function updateRow(id, patch) {
    setIkiList((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (limits && ikiList.length >= limits.max) return;
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
      nilaiKualitasCapaian: (Number(r.indeksCapaianY) || 0) * r.nilaiK3,
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

  // ===================== STEP A: Nama Proyek =====================
  if (!projectSaved) {
    return (
      <div className={styles.wrap}>
        <div className={styles.disclaimerBanner}>
          Halaman ini adalah <strong>simulator/alat bantu estimasi</strong> Nilai K3, NHK, NPK, dan NKP Awal
          berdasarkan pemahaman bersama atas KMK Nomor 127 Tahun 2026 — bukan nilai resmi.
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Mulai Proyek Simulasi Baru</div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nama Proyek Simulasi</label>
            <input
              type="text"
              className={styles.textInput}
              placeholder="mis. Simulasi K3 Triwulan III 2026 - Subdit X"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <button type="button" className={styles.addButton} onClick={handleCreateProject} disabled={busy || !projectName.trim()}>
            {busy ? "Menyimpan..." : "Buat & Simpan Proyek"}
          </button>
          {message && (
            <div className={`${styles.statusMessage} ${message.type === "success" ? styles.statusSuccess : styles.statusError}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Atau Lanjutkan Proyek Tersimpan</div>
          {loadingProjects ? (
            <div className={styles.hintText}>Memuat daftar proyek...</div>
          ) : projectList.length === 0 ? (
            <div className={styles.hintText}>Belum ada proyek simulasi tersimpan.</div>
          ) : (
            <div className={styles.periodeControls}>
              <select className={styles.selectInput} value={selectedExisting} onChange={(e) => setSelectedExisting(e.target.value)}>
                <option value="">Pilih proyek...</option>
                {projectList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.addButton} onClick={handleLoadExisting} disabled={busy || !selectedExisting}>
                Muat Proyek
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================== STEP B: Jabatan Pemilik SKP =====================
  if (!jabatanConfirmed) {
    return (
      <div className={styles.wrap}>
        <div className={styles.sectionBar}>Proyek: {projectName}</div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Jabatan Pemilik SKP</div>
          <div className={styles.hintText}>
            Menentukan batas jumlah minimal &amp; maksimal IKU yang boleh diisi pada simulasi ini.
          </div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Kedudukan</label>
              <select className={styles.selectInput} value={kedudukan} onChange={(e) => setKedudukan(e.target.value)}>
                <option value="">Pilih kedudukan</option>
                {KEDUDUKAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Jenis Jabatan</label>
              <select className={styles.selectInput} value={jabatanSkp} onChange={(e) => setJabatanSkp(e.target.value)}>
                <option value="">Pilih jenis jabatan</option>
                {JABATAN_SKP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {limits && (
            <div className={styles.resultBadge}>
              Batas jumlah IKU untuk kombinasi ini: minimal <strong>{limits.min}</strong>, maksimal{" "}
              <strong>{limits.max}</strong> IKU.
            </div>
          )}
          <button
            type="button"
            className={styles.addButton}
            onClick={handleConfirmJabatan}
            disabled={busy || !kedudukan || !jabatanSkp}
          >
            {busy ? "Menyimpan..." : "Simpan & Lanjutkan ke Simulasi"}
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

  // ===================== STEP C: Simulasi =====================
  const ikuCount = ikiList.length;
  const outOfRange = limits && (ikuCount < limits.min || ikuCount > limits.max);

  return (
    <div className={styles.wrap}>
      <div className={styles.projectBar}>
        <div>
          <strong>{projectName}</strong>
          <span className={styles.hintTextSmall}>
            {" "}
            &middot; {KEDUDUKAN_OPTIONS.find((o) => o.value === kedudukan)?.label} &middot;{" "}
            {JABATAN_SKP_OPTIONS.find((o) => o.value === jabatanSkp)?.label}
          </span>
        </div>
        <div className={styles.projectBarActions}>
          <button type="button" className={styles.addRowLink} onClick={handleDownloadPdf} disabled={pdfBusy}>
            {pdfBusy ? "Membuat PDF..." : "Unduh PDF"}
          </button>
          <button type="button" className={styles.addRowLink} onClick={handleSaveProgress} disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`${styles.statusMessage} ${message.type === "success" ? styles.statusSuccess : styles.statusError}`}>
          {message.text}
        </div>
      )}

      <div ref={pdfContentRef}>
      <div className={styles.disclaimerBanner}>
        Halaman ini adalah <strong>simulator/alat bantu estimasi</strong> Nilai K3, NHK, NPK, dan NKP Awal
        berdasarkan pemahaman bersama atas KMK Nomor 127 Tahun 2026. Beberapa detail (cara persis Nilai
        Kualitas IKU digabung dengan Bobot Kualitas Target, aturan IKU baru, pembagian pita di antara Target
        Y-1 &amp; Realisasi Y-1, dan rumus Indeks Capaian Y untuk IKU Minimize) belum tercantum rumus resminya
        pada materi yang diterima, sehingga nilai di sini <strong>bersifat perkiraan</strong>.
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
        {limits && (
          <div className={`${styles.limitBanner} ${outOfRange ? styles.limitBannerWarning : ""}`}>
            Jumlah IKU: <strong>{ikuCount}</strong> (ketentuan: minimal {limits.min}, maksimal {limits.max} IKU)
          </div>
        )}
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
                      <select className={styles.cellSelect} value={r.validitas} onChange={(e) => updateRow(r.id, { validitas: e.target.value })}>
                        <option value="">-</option>
                        {VALIDITAS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select className={styles.cellSelect} value={r.kendali} onChange={(e) => updateRow(r.id, { kendali: e.target.value })}>
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
                        onChange={(e) => updateRow(r.id, { jenisHistoris: e.target.value })}
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
                        onChange={(e) => updateRow(r.id, { targetY1: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.cellInput}
                        style={{ width: 80 }}
                        disabled={!isLama || !isMaxMin}
                        value={r.realY1}
                        onChange={(e) => updateRow(r.id, { realY1: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.cellInput}
                        style={{ width: 80 }}
                        title="Target Y selalu dapat diisi — dipakai sebagai pembagi Indeks Capaian Y pada 1.B"
                        value={r.targetY}
                        onChange={(e) => updateRow(r.id, { targetY: e.target.value })}
                      />
                    </td>
                    <td>
                      {r.jenisHistoris === "baru" ? (
                        <span
                          className={styles.computedCellStrong}
                          title="Belum ada aturan resmi untuk IKU baru pada materi yang diterima — ditetapkan netral (1)"
                        >
                          1 <span className={styles.hintTextSmall}>(IKU Baru)</span>
                        </span>
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
                      ) : r.bobotTarget != null ? (
                        <span className={styles.computedCellStrong}>
                          {r.bobotTarget} <span className={styles.hintTextSmall}>(Skenario {r.skenario})</span>
                        </span>
                      ) : (
                        <span className={styles.hintTextSmall}>Isi Target Y-1, Real Y-1 &amp; Target Y</span>
                      )}
                      {r.jenisHistoris === "lama" && r.polarisasi !== "stabilize" && (
                        <label className={styles.mandatoryCheck} title="IKU Mandatory dari level Kementerian (bobot minimal 1)">
                          <input type="checkbox" checked={r.mandatory} onChange={(e) => updateRow(r.id, { mandatory: e.target.checked })} />
                          Mandatory
                        </label>
                      )}
                    </td>
                    <td className={styles.computedCellStrong}>{r.nilaiK3 ?? "-"}</td>
                    <td>
                      <button type="button" className={styles.deleteRowButton} title="Hapus baris ini" onClick={() => deleteRow(r.id)}>
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

        <button
          type="button"
          className={styles.addRowLink}
          onClick={addRow}
          disabled={limits && ikuCount >= limits.max}
        >
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
                      <td className={styles.computedCell}>{r.indeksCapaianY ?? "-"}</td>
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

        <div className={styles.summaryBlock}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Nilai Hasil Kerja (NHK)</span>
            <span className={styles.summaryValue}>{formatID(round2(nhk))}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>
              NHK {jabatanScale === "tinggi" ? "(skala 120, tanpa kalibrasi)" : "Kalibrasi 115"}
            </span>
            <span className={styles.summaryValue}>{formatID(round2(nhkFinal))}</span>
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
    </div>
  );
}
