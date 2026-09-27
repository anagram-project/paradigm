import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { findUserByNip } from "@/lib/googleSheets";
import { updatePegawaiByNip } from "@/lib/pegawaiAdmin";
import { ROLES } from "@/lib/roles";

export const runtime = "nodejs";

// POST /api/pengaturan/pegawai/update
// Menyimpan perubahan data satu pegawai. Dua lapis pembatasan (bukan cuma
// disembunyikan di UI, tapi juga dipaksakan di sini):
//   1. LO Subdit hanya boleh mengubah pegawai yang Es3-nya SAMA dengan Es3
//      dia sendiri (dicek terhadap data pegawai target di sheet saat ini,
//      bukan cuma percaya input dari klien).
//   2. LO Subdit tidak boleh mengubah Unit Eselon III/II/I maupun Role —
//      field itu menyangkut struktur organisasi & hak akses, jadi sengaja
//      dibatasi khusus Admin KKPA (LO yang bisa mengubah Es3 pegawainya
//      sendiri berarti bisa "memindahkan" pegawai keluar dari Subdit-nya,
//      dan LO yang bisa mengubah Role bisa menaikkan hak aksesnya sendiri —
//      dua risiko yang tidak disebutkan eksplisit tapi masuk akal dicegah).
//      LO tetap boleh mengubah Unit Eselon IV (Seksi) karena itu masih di
//      dalam Subdit yang sama.
export async function POST(request) {
  const guard = await requireApiRole("/dashboard/pengaturan");
  if (guard.response) return guard.response;
  const { session } = guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { nip } = body || {};
  if (!nip) {
    return NextResponse.json({ error: "NIP pegawai wajib diisi." }, { status: 400 });
  }

  try {
    const target = await findUserByNip(nip);
    if (!target) {
      return NextResponse.json({ error: "Data pegawai tidak ditemukan." }, { status: 404 });
    }

    const isAdmin = session.role === ROLES.ADMIN_KKPA;
    if (!isAdmin) {
      if (session.role !== ROLES.LO_SUBDIT) {
        return NextResponse.json({ error: "Anda tidak memiliki akses untuk melakukan ini." }, { status: 403 });
      }
      if (!session.es3 || target.es3 !== session.es3) {
        return NextResponse.json(
          { error: "Anda hanya dapat mengubah data pegawai pada Subdit Anda sendiri." },
          { status: 403 }
        );
      }
    }

    const patch = {
      nama: body.nama,
      jabatan: body.jabatan,
      pangkat: body.pangkat,
      golongan: body.golongan,
      unitKerja: body.unitKerja,
      es4: body.es4,
    };
    if (isAdmin) {
      patch.es3 = body.es3;
      patch.es2 = body.es2;
      patch.es1 = body.es1;
      patch.role = body.role;
    }

    const result = await updatePegawaiByNip(nip, patch);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Gagal menyimpan perubahan data pegawai." }, { status: 500 });
  }
}
