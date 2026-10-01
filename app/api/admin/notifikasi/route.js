import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { listNotifikasi, createNotifikasi } from "@/lib/notifikasi";

export const runtime = "nodejs";

// Dibatasi ke /dashboard/notifikasi-admin — setelah perubahan di lib/roles.js,
// path ini HANYA bisa diakses role Admin KKPA (LO Subdit & Biasa ditolak).

// GET /api/admin/notifikasi — daftar SEMUA notifikasi (aktif & nonaktif).
export async function GET() {
  const guard = await requireApiRole("/dashboard/notifikasi-admin");
  if (guard.response) return guard.response;

  try {
    const notifikasi = await listNotifikasi();
    return NextResponse.json({ ok: true, notifikasi });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat daftar notifikasi." }, { status: 500 });
  }
}

// POST /api/admin/notifikasi — menambah notifikasi baru.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/notifikasi-admin");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { judul, isi, aktif } = body || {};
  if (!judul || !String(judul).trim()) {
    return NextResponse.json({ error: "Judul notifikasi wajib diisi." }, { status: 400 });
  }

  try {
    const result = await createNotifikasi({ judul, isi, aktif: aktif !== false });
    return NextResponse.json({ ok: true, notifikasi: result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal menambah notifikasi." }, { status: 500 });
  }
}
