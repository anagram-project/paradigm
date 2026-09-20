"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

// Daftar poster pegawai teladan. Tambahkan/ubah baris di sini tiap ada
// poster baru (misal pergantian triwulan) — urutannya mengikuti urutan
// tampil di carousel.
const POSTERS = [
  {
    id: "2025",
    src: "/images/pegawai-teladan-2025.jpg",
    alt: "Selamat Pegawai Teladan — Direktorat Pelaksanaan Anggaran, Tahun 2025",
  },
  {
    id: "2026-tw2",
    src: "/images/pegawai-teladan-2026-tw2.jpg",
    alt: "Selamat Pegawai Teladan — Direktorat Pelaksanaan Anggaran, Triwulan II Tahun 2026",
  },
  {
    id: "2026-tw1",
    src: "/images/pegawai-teladan-2026-tw1.jpg",
    alt: "Selamat Pegawai Teladan — Direktorat Pelaksanaan Anggaran, Triwulan I Tahun 2026",
  },
];

export default function TeladanCarousel() {
  const [slide, setSlide] = useState(0);

  const goPrev = () => setSlide((s) => (s + POSTERS.length - 1) % POSTERS.length);
  const goNext = () => setSlide((s) => (s + 1) % POSTERS.length);

  return (
    <div className={styles.carousel}>
      {POSTERS.map((poster, i) => (
        <div
          key={poster.id}
          className={`${styles.carouselSlide} ${slide === i ? styles.carouselSlideActive : ""}`}
        >
          <Image
            src={poster.src}
            alt={poster.alt}
            fill
            sizes="(max-width: 900px) 100vw, 900px"
            className={styles.carouselImage}
            priority={i === 0}
          />
        </div>
      ))}

      <button
        type="button"
        aria-label="Poster sebelumnya"
        className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
        onClick={goPrev}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Poster berikutnya"
        className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
        onClick={goNext}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2.5">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div className={styles.carouselDots}>
        {POSTERS.map((poster, i) => (
          <button
            key={poster.id}
            type="button"
            aria-label={`Ke poster ${i + 1}`}
            onClick={() => setSlide(i)}
            className={`${styles.dot} ${slide === i ? styles.dotActive : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
