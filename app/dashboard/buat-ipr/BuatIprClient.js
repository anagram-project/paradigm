"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

// Daftar tetap: Triwulan I 2026 s.d. Triwulan IV 2027 (lihat juga
// lib/iprReferensi.js#getIprPeriodeOptions — disalin di sini karena
// komponen ini Client Component dan lib tsb mengimpor "googleapis" yang
// hanya boleh jalan di server).
const ROMAN = ["I", "II", "III", "IV"];
function buildPeriodeOptions() {
  const options = [];
  for (const year of [2026, 2027]) {
    for (const roman of ROMAN) options.push(`Triwulan ${roman} ${year}`);
  }
  return options;
}
const PERIODE_OPTIONS = buildPeriodeOptions();

// 7 aspek BerAKHLAK (menggantikan 6 aspek penilaian lama), sesuai data
// NPK/BerAKHLAK per triwulan dari hasil tarik Monitoring IPR Satu Kemenkeu.
const ASPEK_PERILAKU = [
  { key: "berorientasiPelayanan", label: "Berorientasi Pelayanan" },
  { key: "akuntabel", label: "Akuntabel" },
  { key: "kompeten", label: "Kompeten" },
  { key: "harmonis", label: "Harmonis" },
  { key: "loyal", label: "Loyal" },
  { key: "adaptif", label: "Adaptif" },
  { key: "kolaboratif", label: "Kolaboratif" },
];

function emptyPerilaku() {
  const obj = {};
  ASPEK_PERILAKU.forEach((a) => {
    obj[a.key] = { capaian: "", umpanBalik: "", kendala: "", usulan: "" };
  });
  return obj;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function newHasilKerjaRow(base = {}) {
  return {
    id: `${Date.now()}-${Math.random()}`,
    namaIki: "",
    kategoriIki: "",
    target: "",
    realisasi: "",
    capaian: "",
    umpanBalik: "",
    kendala: "",
    usulan: "",
    ...base,
  };
}

function newPelatihanRow() {
  return { id: `${Date.now()}-${Math.random()}`, topik: "", kompetensi: "", waktu: "", penyelenggara: "" };
}

export default function BuatIprClient() {
  const [periode, setPeriode] = useState(PERIODE_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState(null);
  const [adaReferensi, setAdaReferensi] = useState(true);

  const [identitas, setIdentitas] = useState({ nama: "", nip: "", jabatan: "", es4: "", es3: "", es2: "" });
  const [hasilKerja, setHasilKerja] = useState([]);
  const [perilakuKerja, setPerilakuKerja] = useState(emptyPerilaku());
  const [perilakuReferensi, setPerilakuReferensi] = useState(null);
  const [pelatihan, setPelatihan] = useState([]);
  const [kesimpulan, setKesimpulan] = useState("");
  const [tanggalTtd, setTanggalTtd] = useState(todayIso());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const [refRes, draftRes] = await Promise.all([
          fetch(`/api/buat-ipr/referensi?periode=${encodeURIComponent(periode)}`),
          fetch(`/api/buat-ipr/draft?periode=${encodeURIComponent(periode)}`),
        ]);
        const refData = await refRes.json();
        const draftData = await draftRes.json();
        if (cancelled) return;

        if (!refRes.ok) {
          setMessage({ type: "error", text: refData.error || "Gagal memuat data referensi." });
        }

        const draft = draftRes.ok ? draftData.draft : null;
        const draftHasilByNama = new Map((draft?.hasilKerja || []).map((r) => [r.namaIki, r]));

        // Field "Capaian" diisi otomatis dari Realisasi TW hasil tarik Satu
        // Kemenkeu kalau pegawai belum pernah menyimpan draft untuk IKI ini
        // (atau draft-nya masih kosong) — tetap bisa diedit manual, dan
        // sekali disimpan, nilai simpanan pengguna yang diprioritaskan
        // supaya tidak tertimpa lagi oleh auto-isi pada pemuatan berikutnya.
        let baseHasilKerja = (refData.hasilKerja || []).map((r) => {
          const draftRow = draftHasilByNama.get(r.namaIki);
          const capaianTersimpan = draftRow?.capaian;
          const capaian =
            capaianTersimpan !== undefined && capaianTersimpan !== "" ? capaianTersimpan : r.realisasi || "";
          return newHasilKerjaRow({
            namaIki: r.namaIki,
            kategoriIki: r.kategoriIki,
            target: r.target,
            realisasi: r.realisasi || "",
            capaian,
            umpanBalik: draftRow?.umpanBalik || "",
            kendala: draftRow?.kendala || "",
            usulan: draftRow?.usulan || "",
          });
        });

        // Kalau referensi kosong tapi draft sebelumnya sudah pernah diisi
        // manual (mis. periode belum ada data pull dari Satu Kemenkeu),
        // pakai daftar dari draft supaya isian lama tidak hilang.
        if (baseHasilKerja.length === 0 && (draft?.hasilKerja || []).length > 0) {
          baseHasilKerja = draft.hasilKerja.map((r) => newHasilKerjaRow(r));
        }

        setHasilKerja(baseHasilKerja);
        setAdaReferensi((refData.hasilKerja || []).length > 0);

        setIdentitas({
          nama: refData.identitas?.nama || "",
          nip: refData.identitas?.nip || "",
          jabatan: draft?.jabatan || refData.identitas?.jabatan || "",
          es4: draft?.es4 || refData.identitas?.es4 || "",
          es3: draft?.es3 || refData.identitas?.es3 || "",
          es2: draft?.es2 || refData.identitas?.es2 || "",
        });

        // Field "Capaian" tiap aspek BerAKHLAK diisi otomatis dari nilai
        // NPK/BerAKHLAK triwulan ybs (sama prinsipnya dengan auto-isi Hasil
        // Kerja di atas: draft tersimpan pengguna diprioritaskan, kalau
        // belum ada baru dipakai nilai referensi).
        const perilakuRef = refData.perilakuReferensi || null;
        setPerilakuReferensi(perilakuRef);
        const draftPerilaku = draft?.perilakuKerja || {};
        const basePerilaku = emptyPerilaku();
        ASPEK_PERILAKU.forEach((a) => {
          const draftVal = draftPerilaku[a.key];
          const capaianTersimpan = draftVal?.capaian;
          const autoCapaian = perilakuRef?.aspects?.[a.key] || "";
          basePerilaku[a.key] = {
            capaian: capaianTersimpan !== undefined && capaianTersimpan !== "" ? capaianTersimpan : autoCapaian,
            umpanBalik: draftVal?.umpanBalik || "",
            kendala: draftVal?.kendala || "",
            usulan: draftVal?.usulan || "",
          };
        });
        setPerilakuKerja(basePerilaku);
        setPelatihan((draft?.pelatihan || []).map((p) => ({ id: `${Date.now()}-${Math.random()}`, ...p })));
        setKesimpulan(draft?.kesimpulan || "");
        setTanggalTtd(draft?.tanggalTtd || todayIso());
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

  function updateHasilKerja(id, patch) {
    setHasilKerja((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addHasilKerjaRow() {
    setHasilKerja((prev) => [...prev, newHasilKerjaRow()]);
  }
  function deleteHasilKerjaRow(id) {
    setHasilKerja((prev) => prev.filter((r) => r.id !== id));
  }

  function updatePerilaku(key, patch) {
    setPerilakuKerja((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function updatePelatihan(id, patch) {
    setPelatihan((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addPelatihanRow() {
    setPelatihan((prev) => [...prev, newPelatihanRow()]);
  }
  function deletePelatihanRow(id) {
    setPelatihan((prev) => prev.filter((r) => r.id !== id));
  }

  const payloadBase = useMemo(
    () => ({
      periode,
      nama: identitas.nama,
      jabatan: identitas.jabatan,
      es4: identitas.es4,
      es3: identitas.es3,
      es2: identitas.es2,
      tanggalTtd,
      hasilKerja: hasilKerja.map(({ namaIki, kategoriIki, target, capaian, umpanBalik, kendala, usulan }) => ({
        namaIki,
        kategoriIki,
        target,
        capaian,
        umpanBalik,
        kendala,
        usulan,
      })),
      perilakuKerja,
      pelatihan: pelatihan.map(({ topik, kompetensi, waktu, penyelenggara }) => ({
        topik,
        kompetensi,
        waktu,
        penyelenggara,
      })),
      kesimpulan,
    }),
    [periode, identitas, tanggalTtd, hasilKerja, perilakuKerja, pelatihan, kesimpulan]
  );

  async function handleSaveDraft() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/buat-ipr/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBase),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Gagal menyimpan draft." });
        return;
      }
      setMessage({ type: "success", text: "Draft IPR berhasil disimpan." });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/buat-ipr/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identitas: { nama: identitas.nama, nip: identitas.nip, jabatan: identitas.jabatan, es4: identitas.es4, es3: identitas.es3, es2: identitas.es2 },
          periodeLabel: periode,
          hasilKerja: payloadBase.hasilKerja,
          perilakuKerja,
          pelatihan: payloadBase.pelatihan,
          kesimpulan,
          tanggalTtd,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data.error || "Gagal membuat dokumen IPR." });
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `IPR_${identitas.nama || "pegawai"}_${periode}.docx`.replace(/\s+/g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Dokumen IPR berhasil diunduh." });
    } catch {
      setMessage({ type: "error", text: "Tidak bisa terhubung ke server." });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.disclaimerBanner}>
        Formulir ini mengikuti format <strong>Individual Performance Review (IPR)</strong> sesuai KMK Nomor 127
        Tahun 2026. Daftar IKI pada bagian Hasil Kerja beserta field &quot;Capaian&quot;-nya, serta skor 7 aspek
        BerAKHLAK pada bagian Perilaku Kerja, diisi otomatis dari data referensi hasil tarik Monitoring IPR Satu
        Kemenkeu (dicocokkan dengan NIP Anda) — semua tetap bisa disesuaikan/diedit manual, dan kalau belum
        tersedia untuk periode ini, Anda bisa menambahkan baris IKI secara manual.
      </div>

      <div className={styles.topBar}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Periode IPR</label>
          <select className={styles.selectInput} value={periode} onChange={(e) => setPeriode(e.target.value)}>
            {PERIODE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.topBarActions}>
          <button type="button" className={styles.secondaryButton} onClick={handleSaveDraft} disabled={busy || loading}>
            {busy ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button type="button" className={styles.addButton} onClick={handleDownload} disabled={downloading || loading}>
            {downloading ? "Membuat Dokumen..." : "Unduh Dokumen IPR (.docx)"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`${styles.statusMessage} ${message.type === "success" ? styles.statusSuccess : styles.statusError}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className={styles.card}>
          <div className={styles.hintText}>Memuat data...</div>
        </div>
      ) : (
        <>
          {!adaReferensi && (
            <div className={styles.warningBanner}>
              Belum ada data referensi IKI untuk periode <strong>{periode}</strong> (NIP Anda belum ditemukan pada
              data hasil tarik Monitoring IPR untuk periode ini). Anda tetap bisa mengisi Hasil Kerja secara
              manual di bawah, atau hubungi Admin untuk memperbarui data referensi.
            </div>
          )}

          <div className={styles.sectionBar}>Identitas</div>
          <div className={styles.card}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Nama</label>
                <input type="text" className={styles.textInput} value={identitas.nama} disabled />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>NIP</label>
                <input type="text" className={styles.textInput} value={identitas.nip} disabled />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Jabatan</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={identitas.jabatan}
                  onChange={(e) => setIdentitas((prev) => ({ ...prev, jabatan: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Unit Eselon IV</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={identitas.es4}
                  onChange={(e) => setIdentitas((prev) => ({ ...prev, es4: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Unit Eselon III</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={identitas.es3}
                  onChange={(e) => setIdentitas((prev) => ({ ...prev, es3: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Unit Eselon II</label>
                <input
                  type="text"
                  className={styles.textInput}
                  value={identitas.es2}
                  onChange={(e) => setIdentitas((prev) => ({ ...prev, es2: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Tanggal Tandatangan</label>
                <input
                  type="date"
                  className={styles.textInput}
                  value={tanggalTtd}
                  onChange={(e) => setTanggalTtd(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.sectionBar}>Hasil Kerja</div>
          <div className={styles.card}>
            {hasilKerja.length === 0 && <div className={styles.hintText}>Belum ada baris IKI.</div>}
            {hasilKerja.map((r) => (
              <div className={styles.ikiCard} key={r.id}>
                <div className={styles.ikiCardHeader}>
                  <input
                    type="text"
                    className={styles.ikiTitleInput}
                    placeholder="Nama IKI"
                    value={r.namaIki}
                    onChange={(e) => updateHasilKerja(r.id, { namaIki: e.target.value })}
                  />
                  {r.kategoriIki && <span className={styles.ikiBadge}>{r.kategoriIki}</span>}
                  {r.target && <span className={styles.ikiTarget}>Target periode ini: {r.target}</span>}
                  {r.realisasi && (
                    <span className={styles.ikiTarget}>Realisasi tercatat: {r.realisasi}</span>
                  )}
                  <button
                    type="button"
                    className={styles.deleteRowButton}
                    title="Hapus baris ini"
                    onClick={() => deleteHasilKerjaRow(r.id)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
                <div className={styles.narrativeGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Capaian pada Periode IPR</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={r.capaian}
                      onChange={(e) => updateHasilKerja(r.id, { capaian: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Umpan Balik Berkelanjutan</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={r.umpanBalik}
                      onChange={(e) => updateHasilKerja(r.id, { umpanBalik: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Kendala/Hambatan dan Penyebabnya</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={r.kendala}
                      onChange={(e) => updateHasilKerja(r.id, { kendala: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Usulan Strategi Penyelesaian</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={r.usulan}
                      onChange={(e) => updateHasilKerja(r.id, { usulan: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className={styles.addRowLink} onClick={addHasilKerjaRow}>
              + tambah IKI manual
            </button>
          </div>

          <div className={styles.sectionBar}>Perilaku Kerja</div>
          <div className={styles.card}>
            {perilakuReferensi?.npk && (
              <div className={styles.hintText}>
                Nilai Perilaku Kerja (NPK) periode ini: <strong>{perilakuReferensi.npk}</strong> (hasil tarik
                Monitoring IPR Satu Kemenkeu). Kolom &quot;Capaian&quot; tiap aspek BerAKHLAK di bawah sudah
                terisi otomatis dari nilai ini dan tetap bisa Anda sesuaikan.
              </div>
            )}
            {ASPEK_PERILAKU.map((a) => (
              <div className={styles.ikiCard} key={a.key}>
                <div className={styles.ikiCardHeader}>
                  <span className={styles.ikiCardTitleStatic}>{a.label}</span>
                  {perilakuReferensi?.aspects?.[a.key] && (
                    <span className={styles.ikiTarget}>Skor BerAKHLAK: {perilakuReferensi.aspects[a.key]}</span>
                  )}
                </div>
                <div className={styles.narrativeGrid}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Capaian pada Periode IPR</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={perilakuKerja[a.key]?.capaian || ""}
                      onChange={(e) => updatePerilaku(a.key, { capaian: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Umpan Balik Berkelanjutan</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={perilakuKerja[a.key]?.umpanBalik || ""}
                      onChange={(e) => updatePerilaku(a.key, { umpanBalik: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Kendala/Hambatan dan Penyebabnya</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={perilakuKerja[a.key]?.kendala || ""}
                      onChange={(e) => updatePerilaku(a.key, { kendala: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Usulan Strategi Penyelesaian</label>
                    <textarea
                      className={styles.textArea}
                      rows={3}
                      value={perilakuKerja[a.key]?.usulan || ""}
                      onChange={(e) => updatePerilaku(a.key, { usulan: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.sectionBar}>Usulan Pelatihan (Training)</div>
          <div className={styles.card}>
            {pelatihan.length === 0 && <div className={styles.hintText}>Belum ada usulan pelatihan.</div>}
            {pelatihan.length > 0 && (
              <div className={styles.tableScroll}>
                <table className={styles.editTable}>
                  <thead>
                    <tr>
                      <th>Nama/Topik Pelatihan</th>
                      <th>Kompetensi yang Dikembangkan</th>
                      <th>Waktu</th>
                      <th>Penyelenggara</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pelatihan.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="text"
                            className={styles.cellInput}
                            style={{ minWidth: 180 }}
                            value={p.topik}
                            onChange={(e) => updatePelatihan(p.id, { topik: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className={styles.cellInput}
                            style={{ minWidth: 220 }}
                            value={p.kompetensi}
                            onChange={(e) => updatePelatihan(p.id, { kompetensi: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className={styles.cellInput}
                            style={{ width: 110 }}
                            value={p.waktu}
                            onChange={(e) => updatePelatihan(p.id, { waktu: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className={styles.cellInput}
                            style={{ minWidth: 160 }}
                            value={p.penyelenggara}
                            onChange={(e) => updatePelatihan(p.id, { penyelenggara: e.target.value })}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.deleteRowButton}
                            title="Hapus baris ini"
                            onClick={() => deletePelatihanRow(p.id)}
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
            <button type="button" className={styles.addRowLink} onClick={addPelatihanRow}>
              + tambah usulan pelatihan
            </button>
          </div>

          <div className={styles.sectionBar}>Kesimpulan</div>
          <div className={styles.card}>
            <textarea
              className={styles.textArea}
              rows={4}
              placeholder="Ringkasan umum kinerja & perilaku pada periode ini..."
              value={kesimpulan}
              onChange={(e) => setKesimpulan(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}
