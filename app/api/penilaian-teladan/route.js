import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { kandidatUntukPeriode, periodeTeladanTerlaksana } from "@/lib/teladanKandidat";
import { getPenilaianByPeriode, savePenilaianForPeriode, hitungSkorKandidat, rankByNilaiFinal } from "@/lib/penilaianTeladan";
import { getVoteTally } from "@/lib/votingTeladan";

export const runtime = "nodejs";

const MENU_PATH = "/dashboard/penilaian-pegawai-teladan";

// GET /api/penilaian-teladan?periode=Triwulan%20III%202026
// Khusus Admin KKPA (lihat ADMIN_ONLY_PATHS di lib/roles.js). Menggabungkan
// 3 sumber: daftar kandidat periode ini (lib/teladanKandidat.js), input
// penilaian yang sudah tersimpan Admin (lib/penilaianTeladan.js), dan hasil
// vote pegawai dari menu reguler (lib/votingTeladan.js) — lalu menghitung
// skor & peringkat akhir di sini supaya client tinggal menampilkan.
export async function GET(request) {
  const guard = await requireApiRole(MENU_PATH);
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
  }

  const kandidatList = kandidatUntukPeriode(periode);
  if (kandidatList.length === 0) {
    return NextResponse.json({
      ok: true,
      periode,
      belumDibuka: true,
      totalPemilih: 0,
      rows: [],
    });
  }

  try {
    const [inputMap, { tally, totalPemilih }] = await Promise.all([
      getPenilaianByPeriode(periode),
      getVoteTally({ periode }),
    ]);

    const voteTertinggi = kandidatList.reduce((max, k) => Math.max(max, tally[k.id] || 0), 0);

    const rowsMentah = kandidatList.map((k) => {
      const input = inputMap[k.id] || {};
      const jumlahVote = tally[k.id] || 0;
      const skor = hitungSkorKandidat({
        kerapianBerpakaian: input.kerapianBerpakaian || 0,
        kepatuhanJamKerja: input.kepatuhanJamKerja || 0,
        nilaiIntegritas: input.nilaiIntegritas || 0,
        nilaiKehadiran: input.nilaiKehadiran || 0,
        nilaiKinerjaRaw: input.nilaiKinerjaRaw || 0,
        jumlahVote,
        voteTertinggi,
      });
      return {
        kandidatId: k.id,
        nama: k.namaAsli,
        namaPanggilan: k.namaPanggilan,
        subdit: k.subdit,
        kerapianBerpakaian: input.kerapianBerpakaian || 0,
        kepatuhanJamKerja: input.kepatuhanJamKerja || 0,
        nilaiIntegritas: input.nilaiIntegritas || 0,
        nilaiKehadiran: input.nilaiKehadiran || 0,
        nilaiKinerjaRaw: input.nilaiKinerjaRaw || 0,
        jumlahVote,
        ...skor,
      };
    });

    const rows = rankByNilaiFinal(rowsMentah).sort((a, b) => a.peringkat - b.peringkat);

    return NextResponse.json({ ok: true, periode, belumDibuka: false, totalPemilih, voteTertinggi, rows });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat data penilaian." }, { status: 500 });
  }
}

// POST /api/penilaian-teladan — simpan (replace penuh) input penilaian
// Admin untuk satu periode. Kolom Jumlah Vote TIDAK dikirim/disimpan dari
// sini (selalu dihitung ulang dari hasil voting saat GET).
export async function POST(request) {
  const guard = await requireApiRole(MENU_PATH);
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { periode, rows } = body || {};

    if (!periode) {
      return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
    }
    if (!periodeTeladanTerlaksana(periode)) {
      return NextResponse.json(
        { error: "Periode ini belum memiliki pemilihan/kandidat pegawai teladan." },
        { status: 400 }
      );
    }

    const result = await savePenilaianForPeriode(periode, Array.isArray(rows) ? rows : []);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal menyimpan data penilaian." }, { status: 500 });
  }
}
