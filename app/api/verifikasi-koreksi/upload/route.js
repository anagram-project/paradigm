import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { assertPegawaiDalamWewenang } from "@/lib/verifikasiScope";
import { getPegawaiFolderId, uploadFileToDrive } from "@/lib/googleDrive";
import { upsertFileLink } from "@/lib/koreksiNilai";

export const runtime = "nodejs";

const FAKTOR_VALID = ["1", "2", "3", "4"];
const NOMOR_VALID = ["1", "2", "3"];
const MAX_SIZE_BYTES = 0.5 * 1024 * 1024; // 0,5 MB, sesuai Ketentuan Umum di halaman.

function sanitizeFilename(name) {
  return String(name || "naskah-dinas.pdf").replace(/[\\/:*?"<>|]+/g, "_");
}

// POST /api/verifikasi-koreksi/upload
// multipart/form-data: file, nip, periode, faktor, nomorUrut
// Sama seperti /api/koreksi-nilai/upload, tapi dipanggil oleh LO Subdit/Admin
// KKPA atas nama pegawai lain — file tetap disimpan di folder Drive milik
// pegawai TARGET (bukan folder LO/Admin), dan TIDAK diblokir status kunci.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
  if (guard.response) return guard.response;
  const { session } = guard;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const nip = formData.get("nip");
  const periode = formData.get("periode");
  const faktor = formData.get("faktor");
  const nomorUrut = formData.get("nomorUrut");
  const file = formData.get("file");

  if (!nip || !periode || !FAKTOR_VALID.includes(String(faktor)) || !NOMOR_VALID.includes(String(nomorUrut))) {
    return NextResponse.json({ error: "Data pegawai/periode/faktor/nomor urut tidak valid." }, { status: 400 });
  }
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File belum dipilih." }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (!isPdf) {
    return NextResponse.json({ error: "File harus berformat PDF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file melebihi 0,5 MB. Perkecil dulu ukuran filenya." },
      { status: 400 }
    );
  }

  const scope = await assertPegawaiDalamWewenang(session, nip);
  if (scope.error) {
    return NextResponse.json({ error: scope.error.message }, { status: scope.error.status });
  }
  const target = scope.target;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const folderId = await getPegawaiFolderId(String(periode), target.nip, target.nama);

    const filename = `Faktor${faktor}_No${nomorUrut}_${sanitizeFilename(file.name)}`;
    const uploaded = await uploadFileToDrive({
      folderId,
      filename,
      mimeType: "application/pdf",
      buffer,
    });

    await upsertFileLink({
      nip: target.nip,
      nama: target.nama,
      jabatan: target.jabatan,
      unitKerja: target.unitKerja,
      periode: String(periode),
      faktor: String(faktor),
      nomorUrut: String(nomorUrut),
      linkFile: uploaded.link,
      namaFile: uploaded.name,
      abaikanKunci: true,
    });

    return NextResponse.json({ ok: true, linkFile: uploaded.link, namaFile: uploaded.name });
  } catch (error) {
    console.error("Gagal mengunggah naskah dinas (verifikasi):", error);
    return NextResponse.json(
      { error: "Gagal mengunggah file ke Google Drive. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
