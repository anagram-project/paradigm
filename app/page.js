"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nip, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Email atau kata sandi salah.");
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch (error) {
      setErrorMessage("Tidak bisa terhubung ke server. Coba lagi.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <Image
        src="/images/login-bg.png"
        alt="Gerbang biru dengan pegunungan di latar belakang"
        fill
        priority
        className={styles.bgImage}
      />
      <div className={styles.overlay} />

      <div className={styles.navbar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2">
              <path d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
          </div>
          <span className={styles.brandName}>PARADIGM</span>
        </div>
        <nav className={styles.navLinks}>
          <a href="#">Beranda</a>
          <a href="#">Tentang</a>
          <a href="#">Bantuan</a>
          <a href="#">Kontak</a>
        </nav>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1>Masuk ke PARADIGM</h1>
            <p>Pelaksanaan Anggaran Performance &amp; Risk Action Digitalized Management</p>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="nip">NIP</label>
              <div className={styles.fieldRow}>
                <input
                  id="nip"
                  type="text"
                  inputMode="numeric"
                  autoComplete="username"
                  required
                  placeholder="Masukkan NIP Anda"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                />
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#67BAF4" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="10" r="2" />
                  <path d="M7 16c0-1.7 1.3-3 4.5-3s2.5 1.3 2.5 3M14 8h4M14 12h4" />
                </svg>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Kata Sandi</label>
              <div className={styles.fieldRow}>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#67BAF4" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="10" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
            </div>

            <div className={styles.optionsRow}>
              <label className={styles.rememberMe}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Ingat saya
              </label>
              <a href="#" className={styles.forgotLink}>
                Lupa Kata Sandi?
              </a>
            </div>

            {errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Masuk"}
            </button>
          </form>

          <p className={styles.helpText}>
            Butuh bantuan? <a href="#">Hubungi Admin</a>
          </p>
        </div>
      </div>

      <div className={styles.footer}>
        <span>© {new Date().getFullYear()} Direktorat Pelaksanaan Anggaran — DJPb, Kementerian Keuangan RI</span>
      </div>
    </div>
  );
}
