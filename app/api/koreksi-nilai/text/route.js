import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { upsertJudul } from "@/lib/koreksiNilai";

export const runtime = "nodejs";

const FAKTOR_VALID = ["1", "2", "3", "4"];
const NOMOR_VALID = ["1", "2", "3"];

// POST /api/koreksi-nilai/text
// body: { periode, faktor, nomorUrut, judul }
export async function POST(request) {
  const session = await getSessionUser();
  if (!session?.nip) {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login ulang." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { periode, faktor, nomorUrut, judul } = body || {};

  if (!periode || !FAKTOR_VALID.includes(String(faktor)) || !NOMOR_VALID.includes(String(nomorUrut))) {
    return NextResponse.json({ error: "Data periode/faktor/nomor urut tidak valid." }, { status: 400 });
  }

  if (!judul || !String(judul).trim()) {
    return NextResponse.json({ error: "Judul Bukti Dukung & No ND wajib diisi." }, { status: 400 });
  }

  try {
    await upsertJudul({
      nip: session.nip,
      nama: session.nama,
      jabatan: session.jabatan,
      unitKerja: session.unitKerja,
      periode: String(periode),
      faktor: String(faktor),
      nomorUrut: String(nomorUrut),
      judul: String(judul).trim(),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error.code === "JUDUL_BENTROK") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.code === "TERKUNCI") {
      return NextResponse.json({ error: error.message }, { status: 423 });
    }
    console.error("Gagal menyimpan judul koreksi nilai:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
