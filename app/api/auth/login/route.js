import { NextResponse } from "next/server";
import { findUserByNip } from "@/lib/googleSheets";
import {
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth";

// googleapis butuh Node.js runtime (bukan Edge).
export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const { nip, password } = body || {};

  if (!nip || !password) {
    return NextResponse.json({ error: "NIP dan kata sandi wajib diisi." }, { status: 400 });
  }

  try {
    const user = await findUserByNip(nip);

    if (!user || !(await verifyPassword(password, user.password))) {
      // Sengaja memakai pesan yang sama untuk NIP tidak ditemukan maupun
      // password salah, supaya tidak membocorkan NIP mana yang terdaftar.
      return NextResponse.json({ error: "NIP atau kata sandi salah." }, { status: 401 });
    }

    const token = await createSessionToken({
      nip: user.nip,
      nama: user.nama,
      jabatan: user.jabatan,
      unitKerja: user.unitKerja,
      role: user.role,
    });

    const response = NextResponse.json({
      ok: true,
      user: { nip: user.nip, nama: user.nama, jabatan: user.jabatan, unitKerja: user.unitKerja, role: user.role },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi beberapa saat." },
      { status: 500 }
    );
  }
}
