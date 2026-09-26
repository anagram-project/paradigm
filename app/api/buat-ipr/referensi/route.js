import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import {
  getReferensiRowsForNip,
  getHasilKerjaForPeriode,
  getPerilakuKerjaForPeriode,
  splitUnitOrganisasi,
} from "@/lib/iprReferensi";
import { findUserByNip } from "@/lib/googleSheets";

export async function GET(request) {
  const guard = await requireApiRole("/dashboard/buat-ipr");
  if (guard.response) return guard.response;
  const { session } = guard;

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
  }

  try {
    const referensiRows = await getReferensiRowsForNip(session.nip);
    const hasilKerja = getHasilKerjaForPeriode(referensiRows, periode);
    const perilakuReferensi = getPerilakuKerjaForPeriode(referensiRows, periode);

    // Cari baris referensi yang SKP-nya dipakai pada periode ini (kalau ada)
    // supaya jabatan & unit organisasi yang tampil sesuai posisi pegawai
    // pada periode tsb, bukan posisi terbarunya di Sheet1 (bisa beda kalau
    // pegawai pindah jabatan di tengah tahun).
    const kodeSkpAktif = hasilKerja[0]?.kodeSkp;
    const rowAktif = kodeSkpAktif ? referensiRows.find((r) => r.kodeSkp === kodeSkpAktif) : referensiRows[0];

    let identitas;
    if (rowAktif) {
      const { es4, es3, es2 } = splitUnitOrganisasi(rowAktif.unitOrganisasi);
      identitas = { nama: rowAktif.nama, nip: rowAktif.nip, jabatan: rowAktif.jabatan, es4, es3, es2 };
    } else {
      // Belum ada data referensi untuk NIP ini sama sekali — fallback ke
      // data login (Sheet1), unit eselon dikosongkan (diisi manual di form).
      const user = await findUserByNip(session.nip).catch(() => null);
      identitas = {
        nama: user?.nama || session.nama || "",
        nip: session.nip,
        jabatan: user?.jabatan || session.jabatan || "",
        es4: user?.es4 || "",
        es3: user?.es3 || "",
        es2: user?.es2 || "",
      };
    }

    return NextResponse.json({
      ok: true,
      identitas,
      hasilKerja,
      perilakuReferensi,
      adaReferensi: referensiRows.length > 0,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat data referensi IKI." }, { status: 500 });
  }
}
