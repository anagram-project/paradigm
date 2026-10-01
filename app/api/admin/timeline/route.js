import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { getTimelineByPeriode } from "@/lib/timelineKinerja";

export const runtime = "nodejs";

// GET /api/admin/timeline?periode=Triwulan%20II%202026
// Dibatasi ke /dashboard/update-timeline-kinerja — setelah ADMIN_ONLY_PATHS
// di lib/roles.js, hanya Admin KKPA yang lolos.
export async function GET(request) {
  const guard = await requireApiRole("/dashboard/update-timeline-kinerja");
  if (guard.response) return guard.response;

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
