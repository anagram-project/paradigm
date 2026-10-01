import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { saveTimelineForPeriode } from "@/lib/timelineKinerja";

export const runtime = "nodejs";

// POST /api/admin/timeline/save
// Body: { periode, evaluasiKinerja: [...], manajemenKinerja: [...] }
// Mengganti PENUH data timeline periode tersebut (kedua jenis) — periode
// lain tidak tersentuh.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/update-timeline-kinerja");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { periode, evaluasiKinerja, manajemenKinerja } = body || {};
  if (!periode || !String(periode).trim()) {
    return NextResponse.json({ error: "Periode wajib diisi." }, { status: 400 });
  }

  try {
    const result = await saveTimelineForPeriode(periode, {
      evaluasiKinerja: Array.isArray(evaluasiKinerja) ? evaluasiKinerja : [],
      manajemenKinerja: Array.isArray(manajemenKinerja) ? manajemenKinerja : [],
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error.code === "INVALID") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Gagal menyimpan data timeline." }, { status: 500 });
  }
}
