import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { periodeTeladanTerlaksana } from "@/lib/teladanKandidat";
import { getPenilaianLengkap, savePenilaianForPeriode } from "@/lib/penilaianTeladan";

export const runtime = "nodejs";

const MENU_PATH = "/dashboard/penilaian-pegawai-teladan";

// GET /api/penilaian-teladan?periode=Triwulan%20III%202026
// Khusus Admin KKPA (lihat ADMIN_ONLY_PATHS di lib/roles.js). Penggabungan
// kandidat + input penilaian + hasil vote, serta perhitungan skor &
// peringkat, ada di lib/penilaianTeladan.js (getPenilaianLengkap) supaya
// dipakai bersama dengan endpoint cetak .docx (download/route.js).
export async function GET(request) {
  const guard = await requireApiRole(MENU_PATH);
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
  }

  try {
    const data = await getPenilaianLengkap(periode);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat data penilaian." }, { status: 500 });
  }
}

// POST /api/penilaian-teladan — simpan (replace penuh) input penilaian
// Admin untuk satu periode. Kolom Jumlah Vote TIDAK dikirim/disimpan dari
// sini (selalu dihitung ulang dari hasil voting saat GET).
export async function POST(request) {
  const guard = await requireApiRole(MENU_PATH);
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { periode, rows } = body || {};

    if (!periode) {
      return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
    }
    if (!periodeTeladanTerlaksana(periode)) {
      return NextResponse.json(
        { error: "Periode ini belum memiliki pemilihan/kandidat pegawai teladan." },
        { status: 400 }
      );
    }

    const result = await savePenilaianForPeriode(periode, Array.isArray(rows) ? rows : []);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal menyimpan data penilaian." }, { status: 500 });
  }
}
