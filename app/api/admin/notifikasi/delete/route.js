import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { deleteNotifikasi } from "@/lib/notifikasi";

export const runtime = "nodejs";

// POST /api/admin/notifikasi/delete — menghapus permanen satu notifikasi.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/notifikasi-admin");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { id } = body || {};
  if (!id) {
    return NextResponse.json({ error: "ID notifikasi wajib diisi." }, { status: 400 });
  }

  try {
    const result = await deleteNotifikasi(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Gagal menghapus notifikasi." }, { status: 500 });
  }
}
