import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "paradigm_session";
const SESSION_DURATION = "8h";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 jam, samakan dengan SESSION_DURATION di atas

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diatur di environment variables.");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Membandingkan password yang diketik dengan nilai kolom Password di sheet.
 * Catatan: dibandingkan sebagai teks biasa (bukan hash) sesuai skema data
 * pegawai yang dipakai saat ini — lihat catatan keamanan di README.
 */
export async function verifyPassword(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  return String(inputPassword).trim() === String(storedPassword).trim();
}

/** Membuat token sesi (JWT) berisi identitas pengguna yang sudah login. */
export async function createSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());
}

/** Memverifikasi token sesi. Mengembalikan payload-nya, atau null kalau tidak valid/kedaluwarsa. */
export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

/**
 * Membaca cookie sesi pada request saat ini (dipakai di Server Component /
 * Route Handler, bukan di Edge middleware) dan mengembalikan payload
 * penggunanya (nip, nama, jabatan, role), atau null kalau belum login /
 * sesi tidak valid.
 */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
