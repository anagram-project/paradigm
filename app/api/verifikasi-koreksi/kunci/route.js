import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { setKunciKoreksi } from "@/lib/koreksiNilai";
import { findUserByNip } from "@/lib/googleSheets";

export const runtime = "nodejs";

// POST /api/verifikasi-koreksi/kunci
// body: { nip, periode, locked }
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { nip, periode, locked } = body || {};
  if (!nip || !periode || typeof locked !== "boolean") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const pegawai = await findUserByNip(nip);
    if (!pegawai) {
      return NextResponse.json({ error: "Pegawai tidak ditemukan." }, { status: 404 });
    }
    await setKunciKoreksi({
      nip,
      nama: pegawai.nama,
      jabatan: pegawai.jabatan,
      unitKerja: pegawai.unitKerja,
      periode: String(periode),
      locked,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal mengubah status kunci koreksi nilai:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
