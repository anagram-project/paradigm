import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import { canAccessPath } from "./roles";

/**
 * Dipanggil di awal Server Component halaman yang dibatasi rolenya (mis.
 * Design Kualitas IKU, Pengaturan). Kalau pengguna yang login tidak berhak
 * mengakses `path` ini, langsung diarahkan kembali ke Home — jadi
 * pembatasan menu ini tidak cuma menyembunyikan link di sidebar, tapi juga
 * menutup akses langsung lewat URL.
 */
export async function requireMenuAccess(path) {
  const session = await getSessionUser();
  // Middleware sudah menjamin ada sesi valid untuk semua /dashboard/*, jadi
  // di sini session harusnya selalu ada — tapi tetap dijaga untuk kasus
  // sesi yang baru saja kedaluwarsa di antara request.
  if (!session || !canAccessPath(session.role, path)) {
    redirect("/dashboard");
  }
  return session;
}
