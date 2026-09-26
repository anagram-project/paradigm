import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canAccessPath } from "@/lib/roles";

/**
 * Guard dipakai di Route Handler (API), bukan Server Component — beda dari
 * requireMenuAccess.js (yang redirect halaman kalau tak berhak). Dipakai
 * endpoint yang cuma boleh diakses role tertentu, misalnya fitur Verifikasi
 * Koreksi Nilai yang khusus Admin KKPA & LO Subdit.
 *
 * Pemakaian:
 *   const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
 *   if (guard.response) return guard.response;
 *   // guard.session berisi identitas yang sedang login
 */
export async function requireApiRole(path) {
  const session = await getSessionUser();
  if (!session?.nip) {
    return { response: NextResponse.json({ error: "Sesi tidak valid, silakan login ulang." }, { status: 401 }) };
  }
  if (!canAccessPath(session.role, path)) {
    return { response: NextResponse.json({ error: "Anda tidak memiliki akses untuk melakukan ini." }, { status: 403 }) };
  }
  return { session };
}
