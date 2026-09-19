"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./layout.module.css";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l9-8 9 8M5 10v10h4v-6h6v6h4V10" />
      </svg>
    ),
  },
  {
    href: "/dashboard/buat-ipr",
    label: "Buat IPR",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 2h6l4 4v14a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2z" />
        <path d="M9 12h6M9 16h6M9 8h2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/koreksi-nilai",
    label: "Manajemen Koreksi Nilai",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 20h4l10-10-4-4L4 16v4z" />
        <path d="M13 6l4 4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/kualitas-iku",
    label: "Design Kualitas IKU",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.7" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/dashboard/pegawai-teladan",
    label: "Pemilihan Pegawai Teladan",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-0.5z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/timeline",
    label: "Timeline Kinerja Triwulanan",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
];

const SETTINGS_ITEM = {
  href: "/dashboard/pengaturan",
  label: "Pengaturan",
  icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09a1.7 1.7 0 001.55-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34H9a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87V9a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.55 1z" />
    </svg>
  ),
};

function NavLink({ item, pathname }) {
  const isActive = pathname === item.href;
  return (
    <Link
      href={item.href}
      className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.sidebarBrandMark}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FAFAFA" strokeWidth="2">
              <path d="M3 12l9-9 9 9M5 10v10h14V10" />
            </svg>
          </div>
          <div className={styles.sidebarBrandText}>
            <div className={styles.sidebarBrandName}>PARADIGM</div>
            <div className={styles.sidebarBrandSub}>Dit. Pelaksanaan Anggaran</div>
          </div>
        </div>

        <nav className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <NavLink item={SETTINGS_ITEM} pathname={pathname} />
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7C93B3" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" aria-label="Cari" placeholder="Cari IPR, pegawai, dokumen..." />
          </div>

          <div className={styles.headerRight}>
            <button type="button" aria-label="Notifikasi" className={styles.bellButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#062455" strokeWidth="2">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              <span className={styles.bellDot} />
            </button>

            <div className={styles.profile}>
              <div className={styles.avatar}>S</div>
              <div className={styles.profileText}>
                <div className={styles.profileName}>Syakti</div>
                <div className={styles.profileRole}>Pelaksana</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5F7699" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
