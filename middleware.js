import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "paradigm_session";

function getSecretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "");
}

// Middleware berjalan di Edge runtime, sebelum halaman /dashboard/* dirender.
// Kalau tidak ada sesi valid, pengguna dilempar kembali ke halaman Login.
export async function middleware(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    await jwtVerify(token, getSecretKey());
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
