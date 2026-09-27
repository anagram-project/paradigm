import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { assertPegawaiDalamWewenang } from "@/lib/verifikasiScope";
import { upsertJudul } from "@/lib/koreksiNilai";

export const runtime = "nodejs";

const FAKTOR_VALID = ["1", "2", "3", "4"];
const NOMOR_VALID = ["1", "2", "3"];

// POST /api/verifikasi-koreksi/text
// body: { nip, periode, faktor, nomorUrut, judul }
// Sama seperti /api/koreksi-nilai/text, tapi dipanggil oleh LO Subdit/Admin
// KKPA atas nama pegawai lain (nip disertakan di body, bukan dari sesi), dan
// TIDAK diblokir oleh status kunci (abaikanKunci: true) — lihat catatan di
// lib/koreksiNilai.js#pastikanTidakTerkunci.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/verifikasi-koreksi");
  if (guard.response) return guard.response;
  const { session } = guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { nip, periode, faktor, nomorUrut, judul } = body || {};

  if (!nip || !periode || !FAKTOR_VALID.includes(String(faktor)) || !NOMOR_VALID.includes(String(nomorUrut))) {
    return NextResponse.json({ error: "Data pegawai/periode/faktor/nomor urut tidak valid." }, { status: 400 });
  }
  if (!judul || !String(judul).trim()) {
    return NextResponse.json({ error: "Judul Bukti Dukung & No ND wajib diisi." }, { status: 400 });
  }

  const scope = await assertPegawaiDalamWewenang(session, nip);
  if (scope.error) {
    return NextResponse.json({ error: scope.error.message }, { status: scope.error.status });
  }
  const target = scope.target;

  try {
    await upsertJudul({
      nip: target.nip,
      nama: target.nama,
      jabatan: target.jabatan,
      unitKerja: target.unitKerja,
      periode: String(periode),
      faktor: String(faktor),
      nomorUrut: String(nomorUrut),
      judul: String(judul).trim(),
      abaikanKunci: true,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error.code === "JUDUL_BENTROK") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Gagal menyimpan judul koreksi nilai (verifikasi):", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
