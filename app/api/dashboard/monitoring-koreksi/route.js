import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUsers } from "@/lib/googleSheets";
import { getRingkasanPeriode } from "@/lib/koreksiNilai";

export const runtime = "nodejs";

const FAKTOR_COUNT = 4;
const KELOMPOK_DIREKTUR = "Direktur & Pejabat Fungsional";

function toText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

// Pengelompokan "Kelompok atau Unit" pada dashboard:
//   - Pegawai yang kolom Es3-nya kosong (tidak berada di bawah satu
//     Subdirektorat tertentu, mis. Direktur & pejabat fungsional yang
//     lapor langsung) masuk kelompok "Direktur & Pejabat Fungsional".
//   - Sisanya dikelompokkan sesuai nilai kolom Es3 (nama Subdirektorat).
function kelompokUntuk(user) {
  const es3 = toText(user.es3);
  return es3 || KELOMPOK_DIREKTUR;
}

// GET /api/dashboard/monitoring-koreksi?periode=Triwulan III 2026
export async function GET(request) {
  const session = await getSessionUser();
  if (!session?.nip) {
    return NextResponse.json({ error: "Sesi tidak valid, silakan login ulang." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode");
  if (!periode) {
    return NextResponse.json({ error: "Parameter periode wajib diisi." }, { status: 400 });
  }

  try {
    const [users, ringkasan] = await Promise.all([getUsers(), getRingkasanPeriode(periode)]);
    const ringkasanByNip = new Map(ringkasan.map((r) => [r.nip, r]));

    const kelompokMap = new Map();
    for (const user of users) {
      const label = kelompokUntuk(user);
      if (!kelompokMap.has(label)) {
        kelompokMap.set(label, {
          kelompok: label,
          totalPegawai: 0,
          uploadPegawai: 0,
          faktorCount: { 1: 0, 2: 0, 3: 0, 4: 0 },
        });
      }
      const entry = kelompokMap.get(label);
      entry.totalPegawai += 1;

      const r = ringkasanByNip.get(user.nip);
      if (r) {
        if (r.adaBuktiDukung) entry.uploadPegawai += 1;
        for (let f = 1; f <= FAKTOR_COUNT; f++) {
          if (r.faktorTerisi[f]) entry.faktorCount[f] += 1;
        }
      }
    }

    const data = Array.from(kelompokMap.values())
      .map((e) => ({
        kelompok: e.kelompok,
        totalPegawai: e.totalPegawai,
        uploadPegawai: e.uploadPegawai,
        persenFaktor: [1, 2, 3, 4].map((f) =>
          e.totalPegawai > 0 ? Math.round((e.faktorCount[f] / e.totalPegawai) * 100) : 0
        ),
      }))
      .sort((a, b) => {
        if (a.kelompok === KELOMPOK_DIREKTUR) return -1;
        if (b.kelompok === KELOMPOK_DIREKTUR) return 1;
        return a.kelompok.localeCompare(b.kelompok, "id");
      });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Gagal memuat ringkasan monitoring koreksi nilai:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
