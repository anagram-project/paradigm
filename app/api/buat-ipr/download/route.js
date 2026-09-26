import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { generateIprDocxBuffer } from "@/lib/generateIprDocx";

export async function POST(request) {
  const guard = await requireApiRole("/dashboard/buat-ipr");
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { identitas, periodeLabel, hasilKerja, perilakuKerja, pelatihan, kesimpulan, tanggalTtd } = body || {};

    if (!periodeLabel) {
      return NextResponse.json({ error: "Parameter periodeLabel wajib diisi." }, { status: 400 });
    }

    const buffer = await generateIprDocxBuffer({
      identitas,
      periodeLabel,
      hasilKerja,
      perilakuKerja,
      pelatihan,
      kesimpulan,
      tanggalTtd,
    });

    const safeName = `IPR_${(identitas?.nama || "pegawai").replace(/[^\w-]+/g, "_")}_${periodeLabel.replace(/\s+/g, "_")}.docx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal membuat dokumen IPR." }, { status: 500 });
  }
}
