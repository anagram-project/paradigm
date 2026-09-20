import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEntriesForUser } from "@/lib/koreksiNilai";

export const runtime = "nodejs";

// GET /api/koreksi-nilai?periode=Triwulan%20III%202026
// Mengambil data Faktor 1-3 milik pegawai yang sedang login, untuk satu periode.
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
    const entries = await getEntriesForUser(session.nip, periode);
    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    console.error("Gagal mengambil data koreksi nilai:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
