"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath } from "@/lib/roles";
import styles from "./layout.module.css";

const SIDEBAR_COLLAPSED_KEY = "paradigm.sidebarCollapsed";

const HOME_ITEM = {
  href: "/dashboard",
  label: "Home",
  icon: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11l9-8 9 8M5 10v10h4v-6h6v6h4V10" />
    </svg>
  ),
};

// Klasifikasi menu di sidebar: tiap grup dirender sebagai kartu berwarna
// dengan judul + ikon di atasnya.
// - "Menu Reguler": menu yang bisa diakses semua role (termasuk role Biasa).
// - "Menu Khusus LO": menu yang hanya untuk role dengan akses penuh
//   (Admin KKPA & LO Subdit) — lihat lib/roles.js. Kalau semua item dalam
//   satu grup tersembunyi untuk role yang login, kartu grupnya juga ikut
//   disembunyikan (lihat filter di komponen DashboardShell).
const NAV_GROUPS = [
  {
    label: "Menu Reguler",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
        <circle cx="17" cy="8" r="2.5" />
        <path d="M16 14.2c2.8.6 4.5 2.6 4.5 5.8" />
      </svg>
    ),
    items: [
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
    ],
  },
  {
    label: "Menu Khusus LO",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
      </svg>
    ),
    items: [
      {
        href: "/dashboard/verifikasi-koreksi",
        label: "Verifikasi Koreksi Nilai",
        icon: (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4" />
            <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
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
    ],
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

function NavLink({ item, pathname, collapsed, boxed }) {
  const isActive = pathname === item.href;
  return (
    <Link
      href={item.href}
      className={`${styles.navItem} ${boxed ? styles.navItemBoxed : ""} ${
        isActive ? (boxed ? styles.navItemBoxedActive : styles.navItemActive) : ""
      } ${collapsed ? styles.navItemCollapsed : ""}`}
      title={collapsed ? item.label : undefined}
    >
      {item.icon}
      {!collapsed && <span className={styles.navItemLabel}>{item.label}</span>}
    </Link>
  );
}

// `user` datang dari sesi login (dibaca di layout.js, Server Component) —
// berisi { nama, jabatan }, dipakai untuk menampilkan identitas pegawai yang
// sedang login di pojok kanan atas (bukan lagi teks statis "Syakti").
export default function DashboardShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Preferensi buka/tutup sidebar disimpan di localStorage per-browser saja
  // (bukan di sesi/akun), murni supaya tampilan tetap sesuai pilihan
  // terakhir pengguna saat halaman di-refresh.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (saved === "1") setCollapsed(true);
    } catch (err) {
      // localStorage bisa saja tidak tersedia (mode privat dsb.) — abaikan.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch (err) {
        // abaikan jika localStorage tidak tersedia
      }
      return next;
    });
  }

  const nama = user?.nama || "Pengguna";
  const jabatan = user?.jabatan || "";
  const role = user?.role || "biasa";
  const initial = nama.trim().charAt(0).toUpperCase() || "?";

  // Menu (termasuk Pengaturan) disaring sesuai kewenangan role yang login —
  // lihat lib/roles.js. Ini cuma menyembunyikan link-nya; akses langsung
  // lewat URL ke halaman yang dibatasi tetap ditutup di sisi server lewat
  // lib/requireMenuAccess.js.
  const canSeeHome = canAccessPath(role, HOME_ITEM.href);
  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessPath(role, item.href)),
  })).filter((group) => group.items.length > 0);
  const canSeeSettings = canAccessPath(role, SETTINGS_ITEM.href);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          className={`${styles.collapseToggle} ${collapsed ? styles.collapseToggleFlipped : ""}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>

        <div className={`${styles.sidebarBrand} ${collapsed ? styles.sidebarBrandCollapsed : ""}`}>
          <div className={styles.sidebarBrandMark}>
            <Image src="/images/logo.png" alt="Logo PARADIGM" width={34} height={34} />
          </div>
          {!collapsed && (
            <div className={styles.sidebarBrandText}>
              <div className={styles.sidebarBrandName}>PARADIGM</div>
              <div className={styles.sidebarBrandSub}>Dit. Pelaksanaan Anggaran</div>
            </div>
          )}
        </div>

        <nav className={styles.navList}>
          {canSeeHome && <NavLink item={HOME_ITEM} pathname={pathname} collapsed={collapsed} />}

          {visibleNavGroups.map((group) => (
            <div
              key={group.label}
              className={`${styles.navGroup} ${!collapsed ? styles.navGroupBox : ""}`}
            >
              {!collapsed && (
                <div className={styles.navGroupHeader}>
                  <span className={styles.navGroupIcon}>{group.icon}</span>
                  <span>{group.label}</span>
                </div>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                  boxed={!collapsed}
                />
              ))}
            </div>
          ))}
        </nav>

        {canSeeSettings && (
          <div className={styles.sidebarFooter}>
            {!collapsed && <div className={styles.navGroupLabel}>Settings</div>}
            <NavLink item={SETTINGS_ITEM} pathname={pathname} collapsed={collapsed} />
          </div>
        )}

        <div className={`${styles.sidebarPoweredBy} ${collapsed ? styles.sidebarPoweredByCollapsed : ""}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 2 3 14h7l-1 8 11-14h-7l1-6z" />
          </svg>
          {!collapsed && "powered by KPA1"}
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
              <div className={styles.avatar}>{initial}</div>
              <div className={styles.profileText}>
                <div className={styles.profileName}>{nama}</div>
                <div className={styles.profileRole}>{jabatan}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5F7699" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Keluar"
              className={styles.logoutButton}
              title="Keluar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5F7699" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
