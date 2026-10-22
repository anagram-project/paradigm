"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import TeladanCarousel from "./TeladanCarousel";
import styles from "./page.module.css";
import { KANDIDAT_TELADAN, PERIODE_VOTING_AKTIF } from "@/lib/teladanKandidat";

const MAX_PILIHAN = 3;

export default function TeladanVotingClient() {
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
    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`/api/pegawai-teladan/vote?periode=${encodeURIComponent(PERIODE_VOTING_AKTIF)}`);
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
  }, []);

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

    const kandidatTerpilih = selected.map((id) => KANDIDAT_TELADAN.find((k) => k.id === id)).filter(Boolean);
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
        body: JSON.stringify({ periode: PERIODE_VOTING_AKTIF, pilihan: selected }),
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

  if (loading) {
    return (
      <div className={styles.wrap}>
        <p className={styles.hintText}>Memuat status voting…</p>
      </div>
    );
  }

  if (sudahMemilih) {
    const pilihanDetail = (voteTersimpan?.pilihan || [])
      .map((id) => KANDIDAT_TELADAN.find((k) => k.id === id))
      .filter(Boolean);

    return (
      <div className={styles.wrap}>
        <div className={styles.thanksBox}>
          <p className={styles.thanksTitle}>Terima kasih sudah memilih!</p>
          <p className={styles.thanksSubtitle}>
            Pilihan Anda untuk Pegawai Teladan {PERIODE_VOTING_AKTIF} sudah tersimpan dan tidak dapat diubah lagi.
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
      <button
        type="button"
        className={styles.bannerWrap}
        onClick={scrollToVoting}
        aria-label="Mulai pilih pegawai teladan"
      >
        <Image
          src="/images/pegawai-teladan-2026-tw3-utama.png"
          alt={`Pengumuman Pemilihan Pegawai Teladan ${PERIODE_VOTING_AKTIF}`}
          width={1774}
          height={1097}
          sizes="(max-width: 900px) 100vw, 900px"
          className={styles.bannerImage}
          priority
        />
      </button>

      <div ref={votingSectionRef} className={styles.votingSection}>
        <p className={styles.votingTitle}>Pilih 3 Calon Pegawai Teladan {PERIODE_VOTING_AKTIF}</p>
        <p className={styles.hintText}>
          Klik poster untuk memilih/batalkan. Pilih tepat 3 calon, lalu simpan — pilihan tidak dapat diubah lagi
          setelah disimpan.
        </p>

        <div className={styles.kandidatGrid}>
          {KANDIDAT_TELADAN.map((k) => {
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
                  <span className={styles.kandidatBadgeSubtitle}>{PERIODE_VOTING_AKTIF}</span>
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
