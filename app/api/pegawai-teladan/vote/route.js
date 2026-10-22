import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { getVotingStatus, saveVote } from "@/lib/votingTeladan";
import { isValidKandidatId } from "@/lib/teladanKandidat";

const MENU_PATH = "/dashboard/pegawai-teladan";

export async function GET(request) {
  const guard = await requireApiRole(MENU_PATH);
  if (guard.response) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
  }

  try {
    const status = await getVotingStatus({ nip: session.nip, periode });
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat status voting." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requireApiRole(MENU_PATH);
  if (guard.response) return guard.response;
  const { session } = guard;

  try {
    const body = await request.json();
    const { periode, pilihan } = body || {};

    if (!periode) {
      return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
    }

    const pilihanArray = Array.isArray(pilihan) ? pilihan : [];
    const uniquePilihan = Array.from(new Set(pilihanArray.map((p) => String(p || "").trim()).filter(Boolean)));

    if (uniquePilihan.length !== 3) {
      return NextResponse.json({ error: "Pilih tepat 3 calon pegawai teladan yang berbeda." }, { status: 400 });
    }
    if (!uniquePilihan.every(isValidKandidatId)) {
      return NextResponse.json({ error: "Ada pilihan yang tidak dikenali. Muat ulang halaman dan coba lagi." }, { status: 400 });
    }

    const result = await saveVote({
      nip: session.nip,
      nama: session.nama,
      periode,
      pilihan: uniquePilihan,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error.code === "ALREADY_VOTED") {
      return NextResponse.json({ error: error.message, vote: error.vote }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Gagal menyimpan pilihan." }, { status: 500 });
  }
}
