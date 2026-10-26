"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import TeladanCarousel from "./TeladanCarousel";
import styles from "./page.module.css";
import {
  listPeriodeTeladan,
  periodeTeladanDefault,
  kandidatUntukPeriode,
  periodeTeladanTerlaksana,
  bannerUntukPeriode,
} from "@/lib/teladanKandidat";

const MAX_PILIHAN = 3;

export default function TeladanVotingClient() {
  const periodeOptions = useMemo(() => listPeriodeTeladan(), []);
  const [periode, setPeriode] = useState(() => periodeTeladanDefault());

  const dibuka = periodeTeladanTerlaksana(periode);
  const kandidatList = kandidatUntukPeriode(periode);
  const bannerSrc = bannerUntukPeriode(periode);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [sudahMemilih, setSudahMemilih] = useState(false);
  const [voteTersimpan, setVoteTersimpan] = useState(null);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");
  const votingSectionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    // Periode yang belum terlaksana tidak punya kandidat sama sekali —
    // tidak perlu tanya status voting ke server. Render di bawah mengecek
    // `dibuka` SEBELUM `loading`/`sudahMemilih`, jadi state-state itu tidak
    // perlu direset di sini (efek ini tinggal tidak melakukan apa-apa).
    if (!dibuka) {
      return undefined;
    }

    async function load() {
      setLoading(true);
      setErrorMsg("");
      setSelected([]);
      try {
        const res = await fetch(`/api/pegawai-teladan/vote?periode=${encodeURIComponent(periode)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat status voting.");
        if (cancelled) return;
        setSudahMemilih(Boolean(data.sudahMemilih));
        setVoteTersimpan(data.vote || null);
      } catch (err) {
        if (!cancelled) setErrorMsg(err.message || "Gagal memuat status voting.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [periode, dibuka]);

  function togglePilih(id) {
    setHint("");
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= MAX_PILIHAN) {
        setHint("Anda sudah memilih 3 calon. Batalkan salah satu dulu untuk mengganti pilihan.");
        return prev;
      }
      return [...prev, id];
    });
  }

  function scrollToVoting() {
    votingSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSimpan() {
    if (selected.length !== MAX_PILIHAN || saving) return;

    const kandidatTerpilih = selected.map((id) => kandidatList.find((k) => k.id === id)).filter(Boolean);
    const daftarNama = kandidatTerpilih.map((k, i) => `${i + 1}. ${k.namaAsli} (${k.namaPanggilan})`).join("\n");
    const konfirmasi = window.confirm(
      `Pilihan Anda:\n${daftarNama}\n\nSetelah disimpan, pilihan TIDAK DAPAT diubah lagi. Simpan sekarang?`
    );
    if (!konfirmasi) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/pegawai-teladan/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periode, pilihan: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.vote) {
          setSudahMemilih(true);
          setVoteTersimpan(data.vote);
        }
        throw new Error(data.error || "Gagal menyimpan pilihan.");
      }
      setSudahMemilih(true);
      setVoteTersimpan({ pilihan: selected });
    } catch (err) {
      setErrorMsg(err.message || "Gagal menyimpan pilihan.");
    } finally {
      setSaving(false);
    }
  }

  const periodeSelector = (
    <div className={styles.periodeBar}>
      <div className={styles.periodeBarLabel}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
        Pilih Periode Pegawai Teladan
      </div>
      <select
        className={styles.periodeBarSelect}
        value={periode}
        onChange={(e) => setPeriode(e.target.value)}
        disabled={saving}
      >
        {periodeOptions.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </div>
  );

  if (!dibuka) {
    return (
      <div className={styles.wrap}>
        {periodeSelector}
        <div className={styles.belumDibukaBox}>
          Pemilihan Pegawai Teladan periode <b>{periode}</b> belum dibuka. Pemilihan yang sudah pernah terlaksana
          sejauh ini adalah periode <b>Triwulan III 2026</b> — silakan pilih periode tersebut di atas, atau tunggu
          pengumuman untuk periode berikutnya.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.wrap}>
        {periodeSelector}
        <p className={styles.hintText}>Memuat status voting…</p>
      </div>
    );
  }

  if (sudahMemilih) {
    const pilihanDetail = (voteTersimpan?.pilihan || [])
      .map((id) => kandidatList.find((k) => k.id === id))
      .filter(Boolean);

    return (
      <div className={styles.wrap}>
        {periodeSelector}
        <div className={styles.thanksBox}>
          <p className={styles.thanksTitle}>Terima kasih sudah memilih!</p>
          <p className={styles.thanksSubtitle}>
            Pilihan Anda untuk Pegawai Teladan {periode} sudah tersimpan dan tidak dapat diubah lagi.
          </p>
          {pilihanDetail.length > 0 && (
            <ul className={styles.thanksList}>
              {pilihanDetail.map((k) => (
                <li key={k.id}>
                  {k.namaAsli} ({k.namaPanggilan}) — {k.subdit}
                </li>
              ))}
            </ul>
          )}
        </div>

        <TeladanCarousel />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {periodeSelector}

      {bannerSrc && (
        <button
          type="button"
          className={styles.bannerWrap}
          onClick={scrollToVoting}
          aria-label="Mulai pilih pegawai teladan"
        >
          <Image
            src={bannerSrc}
            alt={`Pengumuman Pemilihan Pegawai Teladan ${periode}`}
            width={1774}
            height={1097}
            sizes="(max-width: 900px) 100vw, 900px"
            className={styles.bannerImage}
            priority
          />
        </button>
      )}

      <div ref={votingSectionRef} className={styles.votingSection}>
        <p className={styles.votingTitle}>Pilih 3 Calon Pegawai Teladan {periode}</p>
        <p className={styles.hintText}>
          Klik poster untuk memilih/batalkan. Pilih tepat 3 calon, lalu simpan — pilihan tidak dapat diubah lagi
          setelah disimpan.
        </p>

        <div className={styles.kandidatGrid}>
          {kandidatList.map((k) => {
            const isSelected = selected.includes(k.id);
            const urutanPilihan = selected.indexOf(k.id) + 1;
            return (
              <button
                type="button"
                key={k.id}
                className={`${styles.kandidatCard} ${isSelected ? styles.kandidatCardSelected : ""}`}
                onClick={() => togglePilih(k.id)}
                aria-pressed={isSelected}
              >
                <div className={styles.kandidatPosterWrap}>
                  <Image
                    src={k.poster}
                    alt={`${k.namaAsli} (${k.namaPanggilan}) — ${k.subdit}`}
                    fill
                    sizes="(max-width: 700px) 45vw, 220px"
                    className={styles.kandidatPoster}
                  />
                  {isSelected && <span className={styles.kandidatCheck}>{urutanPilihan}</span>}
                </div>
                <div className={styles.kandidatBadge}>
                  <span className={styles.kandidatBadgeTitle}>⭐ Calon Pegawai Teladan</span>
                  <span className={styles.kandidatBadgeSubtitle}>{periode}</span>
                </div>
              </button>
            );
          })}
        </div>

        {hint && <p className={styles.votingHint}>{hint}</p>}
        {errorMsg && <p className={`${styles.statusMessage} ${styles.statusError}`}>{errorMsg}</p>}

        <button
          type="button"
          className={styles.addButton}
          disabled={selected.length !== MAX_PILIHAN || saving}
          onClick={handleSimpan}
        >
          {saving ? "Menyimpan…" : `Simpan Pilihan (${selected.length}/${MAX_PILIHAN})`}
        </button>
      </div>
    </div>
  );
}
