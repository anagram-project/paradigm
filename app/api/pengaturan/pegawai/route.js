import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { getUsers } from "@/lib/googleSheets";
import { ROLES, roleLabel } from "@/lib/roles";

export const runtime = "nodejs";

// GET /api/pengaturan/pegawai
// Daftar pegawai untuk kartu "Update Data Pegawai" di menu Pengaturan.
// Admin KKPA melihat seluruh pegawai Direktorat Pelaksanaan Anggaran; LO
// Subdit hanya melihat pegawai pada Subdit (Eselon III) dia sendiri.
export async function GET() {
  const guard = await requireApiRole("/dashboard/pengaturan");
  if (guard.response) return guard.response;
  const { session } = guard;

  try {
    const users = await getUsers();
    const scoped =
      session.role === ROLES.LO_SUBDIT
        ? users.filter((u) => session.es3 && u.es3 === session.es3)
        : users;

    const pegawai = scoped
      .map(({ password, ...rest }) => rest) // jangan pernah kirim Password ke klien
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));

    return NextResponse.json({
      ok: true,
      pegawai,
      role: session.role,
      // Admin KKPA boleh mengubah struktur organisasi (Es1-Es3) & Role;
      // LO Subdit tidak (lihat catatan di route update untuk alasannya).
      bolehUbahStruktur: session.role === ROLES.ADMIN_KKPA,
      subditAnda: session.role === ROLES.LO_SUBDIT ? session.es3 || "" : "",
      roleLabelAnda: roleLabel(session.role),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat data pegawai." }, { status: 500 });
  }
}
