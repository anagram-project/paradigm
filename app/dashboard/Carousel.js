"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./page.module.css";

const SLIDES = ["teladan", "rapat", "deadline"];

export default function Carousel() {
  const [slide, setSlide] = useState(0);

  const goPrev = () => setSlide((s) => (s + SLIDES.length - 1) % SLIDES.length);
  const goNext = () => setSlide((s) => (s + 1) % SLIDES.length);

  return (
    <div className={styles.carousel}>
      <div className={`${styles.carouselSlide} ${slide === 0 ? styles.carouselSlideActive : ""}`}>
        <Image
          src="/images/pegawai-teladan-2026-tw2.jpg"
          alt="Selamat Pegawai Teladan Triwulan II 2026"
          fill
          className={styles.carouselImage}
          priority
        />
      </div>

      <div
        className={`${styles.carouselSlide} ${slide === 1 ? styles.carouselSlideActive : ""}`}
        style={{ background: "linear-gradient(120deg, var(--cobalt) 0%, var(--azure) 100%)" }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A3D1FB" strokeWidth="2">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
        <div className={styles.carouselSlideTitle}>Rapat Koordinasi Triwulanan</div>
        <div className={styles.carouselSlideText}>Jumat, 25 September 2026 — Ruang Rapat Lantai 5</div>
      </div>

      <div
        className={`${styles.carouselSlide} ${slide === 2 ? styles.carouselSlideActive : ""}`}
        style={{ background: "linear-gradient(120deg, var(--azure) 0%, var(--sky) 100%)" }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        <div className={styles.carouselSlideTitle}>Batas Laporan IKU Q3</div>
        <div className={styles.carouselSlideText}>Batas pengumpulan 30 September 2026</div>
      </div>

      <button
        type="button"
        aria-label="Slide sebelumnya"
        className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`}
        onClick={goPrev}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Slide berikutnya"
        className={`${styles.carouselArrow} ${styles.carouselArrowRight}`}
        onClick={goNext}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2.5">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div className={styles.carouselDots}>
        {SLIDES.map((id, i) => (
          <button
            key={id}
            type="button"
            aria-label={`Ke slide ${i + 1}`}
            onClick={() => setSlide(i)}
            className={`${styles.dot} ${slide === i ? styles.dotActive : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
