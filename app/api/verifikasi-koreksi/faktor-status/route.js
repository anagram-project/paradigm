import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { setFaktorVerifikasi } from "@/lib/koreksiNilai";
import { findUserByNip } from "@/lib/googleSheets";

export const runtime = "nodejs";

const FAKTOR_VALID = ["1", "2", "3", "4"];
const STATUS_VALID = ["disetujui", "ditolak", ""];

// POST /api/verifikasi-koreksi/faktor-status
// body: { nip, periode, faktor, status } — status "" untuk membatalkan tanda.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
  if (guard.response) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { nip, periode, faktor } = body || {};
  const status = String(body?.status ?? "");

  if (!nip || !periode || !FAKTOR_VALID.includes(String(faktor)) || !STATUS_VALID.includes(status)) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const pegawai = await findUserByNip(nip);
    if (!pegawai) {
      return NextResponse.json({ error: "Pegawai tidak ditemukan." }, { status: 404 });
    }
    await setFaktorVerifikasi({
      nip,
      nama: pegawai.nama,
      jabatan: pegawai.jabatan,
      unitKerja: pegawai.unitKerja,
      periode: String(periode),
      faktor: String(faktor),
      status,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menyimpan status verifikasi:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
