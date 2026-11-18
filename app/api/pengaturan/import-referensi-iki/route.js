import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { importReferensiCsv, mergeReferensiTriwulan } from "@/lib/iprReferensi";

// Path "/dashboard/pengaturan" TIDAK ada di BIASA_ALLOWED_PATHS (lib/roles.js),
// jadi requireApiRole di sini otomatis membatasi endpoint ini hanya untuk
// Admin KKPA & LO Subdit.
//
// Dua mode (dipilih lewat field "mode" di body, default "overwrite" kalau
// tidak diisi supaya kompatibel dengan pemanggil lama):
// - "overwrite": timpa penuh tab "ReferensiIKI" dengan isi file (perilaku asli).
// - "merge-triwulan": gabung — hanya kolom Realisasi/NPK/7 aspek BerAKHLAK
//   milik triwulan yang dipilih (field "quarter", 1-4) yang diperbarui pada
//   baris yang sudah ada; baris baru (SKP/IKI belum pernah ada) ditambahkan;
//   semua data lain di sheet dibiarkan apa adanya. Lihat lib/iprReferensi.js.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/pengaturan");
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { csvText, mode, quarter } = body || {};
    if (!csvText || !String(csvText).trim()) {
      return NextResponse.json({ error: "Isi file CSV kosong." }, { status: 400 });
    }

    if (mode === "merge-triwulan") {
      const result = await mergeReferensiTriwulan(csvText, quarter);
      return NextResponse.json({ ok: true, mode: "merge-triwulan", quarter: Number(quarter), ...result });
    }

    const result = await importReferensiCsv(csvText);
    return NextResponse.json({ ok: true, mode: "overwrite", ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal mengimpor data referensi IKI." }, { status: 500 });
  }
}
