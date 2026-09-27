"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { ROLES, roleLabel } from "@/lib/roles";

const ROLE_OPTIONS = [ROLES.ADMIN_KKPA, ROLES.LO_SUBDIT, ROLES.BIASA];
const SEMUA = ""; // nilai filter "Semua" (tidak difilter)

function emptyForm() {
  return {
    nama: "",
    jabatan: "",
    pangkat: "",
    golongan: "",
    unitKerja: "",
    es4: "",
    es3: "",
    es2: "",
    es1: "",
    role: ROLES.BIASA,
  };
}

export default function PengaturanClient() {
  // --- Impor Data Referensi IKI ---
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.onerror = () => setMessage({ type: "error", text: "Gagal membaca file." });
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    if (!csvText.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/pengaturan/import-referensi-iki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal mengimpor data." });
        return;
      }
      setMessage({
        type: "success",
        text: `Berhasil mengimpor ${data.totalBaris} baris data untuk ${data.totalPegawai} pegawai ke tab "ReferensiIKI".`,
      });
      setCsvText("");
      setFileName("");
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  // --- Update Data Pegawai ---
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loadingPegawai, setLoadingPegawai] = useState(true);
  const [pegawaiLoadError, setPegawaiLoadError] = useState(null);
  const [bolehUbahStruktur, setBolehUbahStruktur] = useState(false);
  const [subditAnda, setSubditAnda] = useState("");

  const [filterEs2, setFilterEs2] = useState(SEMUA);
  const [filterEs3, setFilterEs3] = useState(SEMUA);
  const [cari, setCari] = useState("");

  const [selectedNip, setSelectedNip] = useState("");
  const [form, setForm] = useState(null);
  const [savingPegawai, setSavingPegawai] = useState(false);
  const [pegawaiMessage, setPegawaiMessage] = useState(null);

  async function loadPegawaiList() {
    setLoadingPegawai(true);
    setPegawaiLoadError(null);
    try {
      const res = await fetch("/api/pengaturan/pegawai");
      const data = await res.json();
      if (!res.ok) {
        setPegawaiLoadError(data.error || "Gagal memuat data pegawai.");
        return;
      }
      setPegawaiList(data.pegawai || []);
      setBolehUbahStruktur(!!data.bolehUbahStruktur);
      setSubditAnda(data.subditAnda || "");
    } catch {
      setPegawaiLoadError("Tidak bisa terhubung ke server.");
    } finally {
      setLoadingPegawai(false);
    }
  }

  useEffect(() => {
    loadPegawaiList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opsiEs2 = useMemo(() => {
    const set = new Set(pegawaiList.map((p) => p.es2).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [pegawaiList]);

  const opsiEs3 = useMemo(() => {
    const relevan = filterEs2 ? pegawaiList.filter((p) => p.es2 === filterEs2) : pegawaiList;
    const set = new Set(relevan.map((p) => p.es3).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [pegawaiList, filterEs2]);

  const pegawaiTersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return pegawaiList.filter((p) => {
      if (filterEs2 && p.es2 !== filterEs2) return false;
      if (filterEs3 && p.es3 !== filterEs3) return false;
      if (q && !p.nama.toLowerCase().includes(q) && !p.nip.includes(q)) return false;
      return true;
    });
  }, [pegawaiList, filterEs2, filterEs3, cari]);

  function pilihPegawai(nip) {
    setSelectedNip(nip);
    setPegawaiMessage(null);
    const p = pegawaiList.find((x) => x.nip === nip);
    if (!p) {
      setForm(null);
      return;
    }
    setForm({
      nama: p.nama || "",
      jabatan: p.jabatan || "",
      pangkat: p.pangkat || "",
      golongan: p.golongan || "",
      unitKerja: p.unitKerja || "",
      es4: p.es4 || "",
      es3: p.es3 || "",
      es2: p.es2 || "",
      es1: p.es1 || "",
      role: p.role || ROLES.BIASA,
    });
  }

  function updateForm(patch) {
    setForm((prev) => ({ ...(prev || emptyForm()), ...patch }));
  }

  async function handleSimpanPegawai() {
    if (!selectedNip || !form) return;
    setSavingPegawai(true);
    setPegawaiMessage(null);
    try {
      const payload = {
        nip: selectedNip,
        nama: form.nama,
        jabatan: form.jabatan,
        pangkat: form.pangkat,
        golongan: form.golongan,
        unitKerja: form.unitKerja,
        es4: form.es4,
      };
      if (bolehUbahStruktur) {
        payload.es3 = form.es3;
        payload.es2 = form.es2;
        payload.es1 = form.es1;
        payload.role = roleLabel(form.role);
      }

      const res = await fetch("/api/pengaturan/pegawai/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setPegawaiMessage({ type: "error", text: data.error || "Gagal menyimpan perubahan data pegawai." });
        return;
      }

      setPegawaiMessage({ type: "success", text: `Data pegawai "${form.nama}" berhasil diperbarui.` });
      setPegawaiList((prev) =>
        prev.map((p) =>
          p.nip === selectedNip
            ? {
                ...p,
                nama: form.nama,
                jabatan: form.jabatan,
                pangkat: form.pangkat,
                golongan: form.golongan,
                unitKerja: form.unitKerja,
                es4: form.es4,
                ...(bolehUbahStruktur ? { es3: form.es3, es2: form.es2, es1: form.es1, role: form.role } : {}),
              }
            : p
        )
      );
    } catch {
      setPegawaiMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setSavingPegawai(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Impor Data Referensi IKI (Monitoring IPR — Satu Kemenkeu)</div>
        <div className={styles.hintText}>
          Unggah file CSV hasil export dari menu Monitoring IPR di Satu Kemenkeu — format &quot;Realisasi &amp;
          Perilaku&quot; (kolom Nama, NIP, Jabatan, Unit Organisasi, Kode SKP, Kategori IKI, Nama IKI, Target TW
          I-IV, Realisasi TW I-IV, NPK, dan skor 7 aspek BerAKHLAK per triwulan). Data ini menjadi referensi
          otomatis untuk menu &quot;Buat IPR&quot; setiap pegawai (dicocokkan berdasarkan NIP) — mengisi otomatis
          field Capaian pada Hasil Kerja (dari Realisasi) maupun Perilaku Kerja (dari skor BerAKHLAK), yang tetap
          bisa disesuaikan manual oleh masing-masing pegawai. Mengunggah file baru akan{" "}
          <strong>menimpa seluruh data referensi lama</strong> — pastikan file yang diunggah adalah data terbaru
          dan lengkap (seluruh pegawai direktorat), bukan sebagian.
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>File CSV</label>
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className={styles.fileInput} />
          {fileName && <div className={styles.hintTextSmall}>Terpilih: {fileName}</div>}
        </div>

        <button type="button" className={styles.addButton} onClick={handleImport} disabled={busy || !csvText.trim()}>
          {busy ? "Mengimpor..." : "Impor ke ReferensiIKI"}
        </button>

        {message && (
          <div className={`${styles.statusMessage} ${message.type === "success" ? styles.statusSuccess : styles.statusError}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Update Data Pegawai</div>

        {bolehUbahStruktur ? (
          <div className={styles.hintText}>
            Sebagai <strong>Admin KKPA</strong>, Anda dapat mengubah data seluruh pegawai Direktorat Pelaksanaan
            Anggaran — gunakan filter Unit Eselon II / Eselon III di bawah untuk mempersempit pencarian. NIP dan
            kata sandi tidak dapat diubah lewat menu ini.
          </div>
        ) : (
          <div className={styles.hintText}>
            Sebagai <strong>LO Subdit</strong>, Anda hanya dapat mengubah data pegawai pada Subdit Anda sendiri
            {subditAnda ? (
              <>
                {" "}
                (<strong>{subditAnda}</strong>)
              </>
            ) : (
              ""
            )}
            . Unit Eselon III/II/I dan Role pegawai hanya dapat diubah oleh Admin KKPA. NIP dan kata sandi tidak
            dapat diubah lewat menu ini.
          </div>
        )}

        {pegawaiLoadError && (
          <div className={`${styles.statusMessage} ${styles.statusError}`}>{pegawaiLoadError}</div>
        )}

        {loadingPegawai ? (
          <div className={styles.hintText}>Memuat data pegawai...</div>
        ) : (
          <>
            <div className={styles.filterRow}>
              {bolehUbahStruktur && (
                <>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Filter Unit Eselon II</label>
                    <select
                      className={styles.selectInput}
                      value={filterEs2}
                      onChange={(e) => {
                        setFilterEs2(e.target.value);
                        setFilterEs3(SEMUA);
                      }}
                    >
                      <option value={SEMUA}>Semua</option>
                      {opsiEs2.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Filter Unit Eselon III</label>
                    <select className={styles.selectInput} value={filterEs3} onChange={(e) => setFilterEs3(e.target.value)}>
                      <option value={SEMUA}>Semua</option>
                      {opsiEs3.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Cari Nama/NIP</label>
                <input
                  type="text"
                  className={styles.textInput}
                  placeholder="Ketik nama atau NIP..."
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Pilih Pegawai ({pegawaiTersaring.length} pegawai)</label>
              <select
                className={styles.selectInput}
                value={selectedNip}
                onChange={(e) => pilihPegawai(e.target.value)}
              >
                <option value="">Pilih Pegawai</option>
                {pegawaiTersaring.map((p) => (
                  <option key={p.nip} value={p.nip}>
                    {p.nama} — {p.nip}
                  </option>
                ))}
              </select>
            </div>

            {form && (
              <>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>NIP</label>
                    <input type="text" className={styles.textInput} value={selectedNip} disabled />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Nama</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.nama}
                      onChange={(e) => updateForm({ nama: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Jabatan</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.jabatan}
                      onChange={(e) => updateForm({ jabatan: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Pangkat</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.pangkat}
                      onChange={(e) => updateForm({ pangkat: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Golongan</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.golongan}
                      onChange={(e) => updateForm({ golongan: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Unit Kerja</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.unitKerja}
                      onChange={(e) => updateForm({ unitKerja: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Unit Eselon IV (Seksi)</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.es4}
                      onChange={(e) => updateForm({ es4: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Unit Eselon III (Subdit)</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.es3}
                      disabled={!bolehUbahStruktur}
                      onChange={(e) => updateForm({ es3: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Unit Eselon II</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.es2}
                      disabled={!bolehUbahStruktur}
                      onChange={(e) => updateForm({ es2: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Unit Eselon I</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={form.es1}
                      disabled={!bolehUbahStruktur}
                      onChange={(e) => updateForm({ es1: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Role</label>
                    <select
                      className={styles.selectInput}
                      value={form.role}
                      disabled={!bolehUbahStruktur}
                      onChange={(e) => updateForm({ role: e.target.value })}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="button" className={styles.addButton} onClick={handleSimpanPegawai} disabled={savingPegawai}>
                  {savingPegawai ? "Menyimpan..." : "Simpan Perubahan"}
                </button>

                {pegawaiMessage && (
                  <div
                    className={`${styles.statusMessage} ${
                      pegawaiMessage.type === "success" ? styles.statusSuccess : styles.statusError
                    }`}
                  >
                    {pegawaiMessage.text}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
