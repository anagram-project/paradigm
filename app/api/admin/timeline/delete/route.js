import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { deleteTimelineForPeriode } from "@/lib/timelineKinerja";

export const runtime = "nodejs";

// POST /api/admin/timeline/delete
// Menghapus seluruh data timeline (kedua jenis) satu periode. Kalau
// periode-nya PERIODE_SEED_DEFAULT, tampilan publik otomatis kembali ke
// data bawaan (lihat getTimelineByPeriode di lib/timelineKinerja.js).
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/update-timeline-kinerja");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { periode } = body || {};
  if (!periode) {
    return NextResponse.json({ error: "Periode wajib diisi." }, { status: 400 });
  }

  try {
    const result = await deleteTimelineForPeriode(periode);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Gagal menghapus data timeline." }, { status: 500 });
  }
}
