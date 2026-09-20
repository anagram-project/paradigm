import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { exchangeGoogleDriveAuthCode } from "@/lib/googleDrive";

export const runtime = "nodejs";

// GET /api/auth/google-drive/callback
// Langkah 2 dari alur "hubungkan akun Google Drive saya" — Google
// mengarahkan ke sini setelah pengguna menyetujui izin akses Drive.
export async function GET(request) {
  const session = await getSessionUser();
  if (!session?.nip) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    return htmlResponse(`<p>Google menolak permintaan izin: <code>${escapeHtml(errorParam)}</code></p>`);
  }
  if (!code) {
    return htmlResponse("<p>Kode otorisasi tidak ditemukan pada URL ini.</p>");
  }

  try {
    const tokens = await exchangeGoogleDriveAuthCode(code);

    if (!tokens.refresh_token) {
      return htmlResponse(`
        <p>Google tidak mengirim refresh token baru kali ini (biasanya karena akun ini pernah memberi izin sebelumnya dan Google menganggap sudah ada token aktif).</p>
        <p>Silakan buka <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">halaman izin akun Google Anda</a>, cabut akses OAuth Client aplikasi ini, lalu ulangi dari <a href="/api/auth/google-drive/start">/api/auth/google-drive/start</a>.</p>
      `);
    }

    return htmlResponse(`
      <p><strong>Berhasil terhubung.</strong> Salin nilai di bawah ini, lalu tempelkan sebagai variabel <code>GOOGLE_OAUTH_REFRESH_TOKEN</code> di <code>.env.local</code> dan di Environment Variables Vercel, lalu redeploy:</p>
      <pre style="background:#f1f5f9;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all;">${escapeHtml(tokens.refresh_token)}</pre>
      <p>Setelah tersimpan, semua file Naskah Dinas yang diunggah lewat PARADIGM akan tercatat sebagai milik akun Google Anda sendiri (bukan Service Account), jadi kuota penyimpanan yang dipakai adalah kuota Drive Anda.</p>
      <p style="color:#64748b;font-size:14px;">Halaman ini boleh ditutup setelah nilainya disalin.</p>
    `);
  } catch (error) {
    console.error("Gagal menukar kode OAuth Google Drive:", error);
    return htmlResponse(`<p>Gagal menghubungkan akun Google: ${escapeHtml(error.message)}</p>`);
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function htmlResponse(bodyHtml) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hubungkan Google Drive - PARADIGM</title></head>
    <body style="font-family:system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 16px;color:#1e293b;line-height:1.6">
      <h2>Hubungkan Google Drive</h2>
      ${bodyHtml}
    </body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
