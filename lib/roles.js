// Definisi 3 role PARADIGM dan menu apa saja yang boleh diakses tiap role.
// File ini dipakai baik dari Server Component (guard akses halaman) maupun
// Client Component (DashboardShell, untuk menyaring menu di sidebar) —
// jadi jangan tambahkan import yang server-only (next/headers, dll) di sini.

export const ROLES = {
  ADMIN_KKPA: "admin_kkpa",
  LO_SUBDIT: "lo_subdit",
  BIASA: "biasa",
};

const ROLE_LABELS = {
  [ROLES.ADMIN_KKPA]: "Admin KKPA",
  [ROLES.LO_SUBDIT]: "LO Subdit",
  [ROLES.BIASA]: "Biasa",
};

// Role yang otomatis mendapat akses ke SELURUH menu — KECUALI menu yang
// secara eksplisit didaftarkan di ADMIN_ONLY_PATHS di bawah (dicek lebih
// dulu di canAccessPath sebelum shortcut "akses penuh" ini berlaku).
const FULL_ACCESS_ROLES = [ROLES.ADMIN_KKPA, ROLES.LO_SUBDIT];

// Menu yang HANYA boleh diakses role Admin KKPA — termasuk LO Subdit tetap
// tertutup, meskipun LO Subdit ada di FULL_ACCESS_ROLES di atas. Dipakai
// untuk menu "Menu Khusus Admin Aplikasi" (mis. Update/Edit Notifikasi),
// yang menyangkut pengaturan yang dipakai bersama seluruh pengguna aplikasi.
const ADMIN_ONLY_PATHS = new Set(["/dashboard/notifikasi-admin", "/dashboard/update-timeline-kinerja"]);

// Menu yang boleh diakses role "Biasa". Path harus sama persis dengan href
// menu terkait di DashboardShell.js. Di luar daftar ini (mis. Design
// Kualitas IKU, Pengaturan) otomatis tertutup untuk role Biasa.
const BIASA_ALLOWED_PATHS = new Set([
  "/dashboard",
  "/dashboard/buat-ipr",
  "/dashboard/koreksi-nilai",
  "/dashboard/pegawai-teladan",
  "/dashboard/timeline",
]);

/**
 * Mengubah teks apa adanya dari kolom "Role" di spreadsheet data pegawai
 * menjadi salah satu dari 3 nilai baku di atas. Variasi penulisan
 * ditoleransi (huruf besar/kecil, spasi/underscore/strip, dsb). Default ke
 * "biasa" kalau kosong atau tidak dikenali — supaya pegawai baru yang belum
 * diisi kolom Role-nya tetap dapat akses menu standar, bukan malah error.
 */
export function normalizeRole(raw) {
  const text = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

  if (text === "admin kkpa" || text === "admin" || text === "kkpa") {
    return ROLES.ADMIN_KKPA;
  }
  if (text === "lo subdit" || text === "lo" || text === "liaison officer subdit" || text === "liaison officer") {
    return ROLES.LO_SUBDIT;
  }
  return ROLES.BIASA;
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || ROLE_LABELS[ROLES.BIASA];
}

/** Apakah `role` ini boleh mengakses halaman dengan path `path`? */
export function canAccessPath(role, path) {
  // Dicek PALING AWAL, sebelum shortcut akses-penuh di bawah — supaya menu
  // khusus Admin KKPA tetap tertutup untuk LO Subdit walau LO Subdit ada di
  // FULL_ACCESS_ROLES.
  if (ADMIN_ONLY_PATHS.has(path)) {
    return role === ROLES.ADMIN_KKPA;
  }
  if (FULL_ACCESS_ROLES.includes(role)) return true;
  return BIASA_ALLOWED_PATHS.has(path);
}
