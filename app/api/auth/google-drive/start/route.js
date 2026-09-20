import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getGoogleDriveAuthUrl } from "@/lib/googleDrive";

export const runtime = "nodejs";

// GET /api/auth/google-drive/start
// Langkah 1 dari alur "hubungkan akun Google Drive saya" — hanya perlu
// dibuka satu kali (lalu ulangi lagi kalau suatu saat refresh token
// kedaluwarsa/dicabut). Harus sudah login ke PARADIGM dulu.
export async function GET(request) {
  const session = await getSessionUser();
  if (!session?.nip) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const authUrl = getGoogleDriveAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px;color:#1e293b;line-height:1.6">
        <h2>Belum bisa menghubungkan Google Drive</h2>
        <p>${escapeHtml(error.message)}</p>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
