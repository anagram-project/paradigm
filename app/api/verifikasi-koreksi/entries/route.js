import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { getEntriesForUser, getVerifikasiStatus } from "@/lib/koreksiNilai";

export const runtime = "nodejs";

// GET /api/verifikasi-koreksi/entries?nip=...&periode=...
// Data bukti dukung + status kunci/verifikasi milik SATU pegawai (bukan
// pegawai yang sedang login), dipakai LO di menu Verifikasi Koreksi Nilai.
export async function GET(request) {
  const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const nip = searchParams.get("nip");
  const periode = searchParams.get("periode");
  if (!nip || !periode) {
    return NextResponse.json({ error: "Parameter nip dan periode wajib diisi." }, { status: 400 });
  }

  try {
    const [entries, verifikasi] = await Promise.all([
      getEntriesForUser(nip, periode),
      getVerifikasiStatus({ nip, periode }),
    ]);
    return NextResponse.json({
      ok: true,
      entries,
      locked: verifikasi.locked,
      faktorStatus: verifikasi.faktorStatus,
    });
  } catch (error) {
    console.error("Gagal mengambil data verifikasi koreksi nilai:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
