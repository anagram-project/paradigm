import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { getPenilaianLengkap } from "@/lib/penilaianTeladan";
import { generatePenilaianTeladanDocxBuffer } from "@/lib/generatePenilaianTeladanDocx";

export const runtime = "nodejs";

const MENU_PATH = "/dashboard/penilaian-pegawai-teladan";

// GET /api/penilaian-teladan/download?periode=Triwulan%20III%202026
// Mencetak tabel perhitungan Penilaian Pegawai Teladan periode ini sebagai
// dokumen Word (.docx) — datanya sama persis dengan yang ditampilkan di
// tabel admin (lib/penilaianTeladan.js: getPenilaianLengkap), hanya dirender
// ulang sebagai dokumen (lib/generatePenilaianTeladanDocx.js).
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
    if (data.belumDibuka || data.rows.length === 0) {
      return NextResponse.json(
        { error: "Periode ini belum memiliki kandidat/penilaian untuk dicetak." },
        { status: 400 }
      );
    }

    const dibuatOleh = guard.session?.nama || "";

    const buffer = await generatePenilaianTeladanDocxBuffer({
      periode: data.periode,
      rows: data.rows,
      totalPemilih: data.totalPemilih,
      voteTertinggi: data.voteTertinggi,
      dibuatOleh,
    });

    const safeName = `Penilaian_Pegawai_Teladan_${String(periode).replace(/\s+/g, "_")}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal membuat dokumen penilaian." }, { status: 500 });
  }
}
