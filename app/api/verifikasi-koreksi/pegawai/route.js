import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { getUsers } from "@/lib/googleSheets";

export const runtime = "nodejs";

// GET /api/verifikasi-koreksi/pegawai
// Daftar pegawai untuk dropdown "Pilih Pegawai yang akan Diverifikasi".
export async function GET() {
  const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
  if (guard.response) return guard.response;

  try {
    const users = await getUsers();
    const pegawai = users
      .map((u) => ({ nip: u.nip, nama: u.nama, jabatan: u.jabatan, unitKerja: u.unitKerja }))
      .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    return NextResponse.json({ ok: true, pegawai });
  } catch (error) {
    console.error("Gagal mengambil daftar pegawai untuk verifikasi:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
