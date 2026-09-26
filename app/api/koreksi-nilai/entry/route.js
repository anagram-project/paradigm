import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteEntrySlot } from "@/lib/koreksiNilai";
import { deleteFileFromDriveByLink } from "@/lib/googleDrive";

export const runtime = "nodejs";

const FAKTOR_VALID = ["1", "2", "3", "4"];
const NOMOR_VALID = ["1", "2", "3"];

// DELETE /api/koreksi-nilai/entry
// body: { periode, faktor, nomorUrut }
// Menghapus judul + file (kalau ada) untuk satu slot bukti dukung.
export async function DELETE(request) {
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

  const { periode, faktor, nomorUrut } = body || {};

  if (!periode || !FAKTOR_VALID.includes(String(faktor)) || !NOMOR_VALID.includes(String(nomorUrut))) {
    return NextResponse.json({ error: "Data periode/faktor/nomor urut tidak valid." }, { status: 400 });
  }

  try {
    const { linkFile } = await deleteEntrySlot({
      nip: session.nip,
      periode: String(periode),
      faktor: String(faktor),
      nomorUrut: String(nomorUrut),
    });

    if (linkFile) {
      try {
        await deleteFileFromDriveByLink(linkFile);
      } catch (driveError) {
        // Data di spreadsheet sudah bersih. Kalau hapus file fisik di Drive
        // gagal (mis. sudah dihapus manual sebelumnya), tetap dianggap
        // berhasil di sisi pengguna supaya tidak ada data yang "nyangkut".
        console.error("Gagal menghapus file fisik di Drive (dilewati):", driveError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error.code === "TERKUNCI") {
      return NextResponse.json({ error: error.message }, { status: 423 });
    }
    console.error("Gagal menghapus bukti dukung koreksi nilai:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
