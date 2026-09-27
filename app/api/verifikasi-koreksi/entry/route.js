import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { assertPegawaiDalamWewenang } from "@/lib/verifikasiScope";
import { deleteEntrySlot } from "@/lib/koreksiNilai";
import { deleteFileFromDriveByLink } from "@/lib/googleDrive";

export const runtime = "nodejs";

const FAKTOR_VALID = ["1", "2", "3", "4"];
const NOMOR_VALID = ["1", "2", "3"];

// DELETE /api/verifikasi-koreksi/entry
// body: { nip, periode, faktor, nomorUrut }
// Sama seperti /api/koreksi-nilai/entry, tapi dipanggil oleh LO Subdit/Admin
// KKPA atas nama pegawai lain, dan TIDAK diblokir oleh status kunci.
export async function DELETE(request) {
  const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
  if (guard.response) return guard.response;
  const { session } = guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { nip, periode, faktor, nomorUrut } = body || {};

  if (!nip || !periode || !FAKTOR_VALID.includes(String(faktor)) || !NOMOR_VALID.includes(String(nomorUrut))) {
    return NextResponse.json({ error: "Data pegawai/periode/faktor/nomor urut tidak valid." }, { status: 400 });
  }

  const scope = await assertPegawaiDalamWewenang(session, nip);
  if (scope.error) {
    return NextResponse.json({ error: scope.error.message }, { status: scope.error.status });
  }
  const target = scope.target;

  try {
    const { linkFile } = await deleteEntrySlot({
      nip: target.nip,
      periode: String(periode),
      faktor: String(faktor),
      nomorUrut: String(nomorUrut),
      abaikanKunci: true,
    });

    if (linkFile) {
      try {
        await deleteFileFromDriveByLink(linkFile);
      } catch (driveError) {
        console.error("Gagal menghapus file fisik di Drive (dilewati):", driveError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Gagal menghapus bukti dukung koreksi nilai (verifikasi):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
