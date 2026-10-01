import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { updateNotifikasi } from "@/lib/notifikasi";

export const runtime = "nodejs";

// POST /api/admin/notifikasi/update — mengubah judul/isi/status aktif satu notifikasi.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/notifikasi-admin");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { id, judul, isi, aktif } = body || {};
  if (!id) {
    return NextResponse.json({ error: "ID notifikasi wajib diisi." }, { status: 400 });
  }

  try {
    const result = await updateNotifikasi(id, { judul, isi, aktif });
    return NextResponse.json({ ok: true, notifikasi: result });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.code === "INVALID") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Gagal menyimpan perubahan notifikasi." }, { status: 500 });
  }
}
