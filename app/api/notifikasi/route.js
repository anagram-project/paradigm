import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listNotifikasiAktif } from "@/lib/notifikasi";

export const runtime = "nodejs";

// GET /api/notifikasi
// Dipakai lonceng notifikasi di header (DashboardShell) — TERBUKA untuk
// semua role yang sedang login (bukan cuma Admin KKPA), karena notifikasi
// ini memang ditujukan untuk seluruh pengguna aplikasi. Hanya mengembalikan
// notifikasi yang Aktif=TRUE; jumlahnya dipakai sebagai angka di lonceng.
export async function GET() {
  const session = await getSessionUser();
  if (!session?.nip) {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login ulang." }, { status: 401 });
  }

  try {
    const notifikasi = await listNotifikasiAktif();
    return NextResponse.json({ ok: true, notifikasi });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat notifikasi." }, { status: 500 });
  }
}
