import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { importReferensiCsv } from "@/lib/iprReferensi";

// Path "/dashboard/pengaturan" TIDAK ada di BIASA_ALLOWED_PATHS (lib/roles.js),
// jadi requireApiRole di sini otomatis membatasi endpoint ini hanya untuk
// Admin KKPA & LO Subdit.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/pengaturan");
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { csvText } = body || {};
    if (!csvText || !String(csvText).trim()) {
      return NextResponse.json({ error: "Isi file CSV kosong." }, { status: 400 });
    }

    const result = await importReferensiCsv(csvText);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal mengimpor data referensi IKI." }, { status: 500 });
  }
}
