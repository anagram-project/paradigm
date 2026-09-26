import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPegawaiFolderId, uploadFileToDrive } from "@/lib/googleDrive";
import { upsertFileLink } from "@/lib/koreksiNilai";

export const runtime = "nodejs";

const FAKTOR_VALID = ["1", "2", "3", "4"];
const NOMOR_VALID = ["1", "2", "3"];
const MAX_SIZE_BYTES = 0.5 * 1024 * 1024; // 0,5 MB, sesuai Ketentuan Umum di halaman.

function sanitizeFilename(name) {
  return String(name || "naskah-dinas.pdf").replace(/[\\/:*?"<>|]+/g, "_");
}

// POST /api/koreksi-nilai/upload
// multipart/form-data: file, periode, faktor, nomorUrut
export async function POST(request) {
  const session = await getSessionUser();
  if (!session?.nip) {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login ulang." }, { status: 401 });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const periode = formData.get("periode");
  const faktor = formData.get("faktor");
  const nomorUrut = formData.get("nomorUrut");
  const file = formData.get("file");

  if (!periode || !FAKTOR_VALID.includes(String(faktor)) || !NOMOR_VALID.includes(String(nomorUrut))) {
    return NextResponse.json({ error: "Data periode/faktor/nomor urut tidak valid." }, { status: 400 });
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

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const folderId = await getPegawaiFolderId(String(periode), session.nip, session.nama);

    const filename = `Faktor${faktor}_No${nomorUrut}_${sanitizeFilename(file.name)}`;
    const uploaded = await uploadFileToDrive({
      folderId,
      filename,
      mimeType: "application/pdf",
      buffer,
    });

    await upsertFileLink({
      nip: session.nip,
      nama: session.nama,
      jabatan: session.jabatan,
      unitKerja: session.unitKerja,
      periode: String(periode),
      faktor: String(faktor),
      nomorUrut: String(nomorUrut),
      linkFile: uploaded.link,
      namaFile: uploaded.name,
    });

    return NextResponse.json({ ok: true, linkFile: uploaded.link, namaFile: uploaded.name });
  } catch (error) {
    if (error.code === "TERKUNCI") {
      return NextResponse.json({ error: error.message }, { status: 423 });
    }
    console.error("Gagal mengunggah naskah dinas:", error);
    return NextResponse.json(
      { error: "Gagal mengunggah file ke Google Drive. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
