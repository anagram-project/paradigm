import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { saveDraft, loadDraft } from "@/lib/buatIprDraft";

export async function GET(request) {
  const guard = await requireApiRole("/dashboard/buat-ipr");
  if (guard.response) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
  }

  try {
    const draft = await loadDraft({ nip: session.nip, periode });
    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat draft IPR." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requireApiRole("/dashboard/buat-ipr");
  if (guard.response) return guard.response;
  const { session } = guard;

  try {
    const body = await request.json();
    const { periode, nama, jabatan, es4, es3, es2, tanggalTtd, hasilKerja, perilakuKerja, pelatihan, kesimpulan } =
      body || {};

    if (!periode) {
      return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
    }

    const result = await saveDraft({
      nip: session.nip,
      nama,
      jabatan,
      es4,
      es3,
      es2,
      periode,
      tanggalTtd,
      hasilKerja,
      perilakuKerja,
      pelatihan,
      kesimpulan,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal menyimpan draft IPR." }, { status: 500 });
  }
}
