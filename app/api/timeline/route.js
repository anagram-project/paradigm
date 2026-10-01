import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getTimelineByPeriode } from "@/lib/timelineKinerja";

export const runtime = "nodejs";

// GET /api/timeline?periode=Triwulan%20II%202026
// Dipakai halaman "Timeline Kinerja Triwulanan" — TERBUKA untuk semua role
// yang sedang login (sama seperti menu ini sendiri boleh diakses semua
// role, lihat lib/roles.js BIASA_ALLOWED_PATHS).
export async function GET(request) {
  const session = await getSessionUser();
  if (!session?.nip) {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login ulang." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
  }

  try {
    const data = await getTimelineByPeriode(periode);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat data timeline." }, { status: 500 });
  }
}
