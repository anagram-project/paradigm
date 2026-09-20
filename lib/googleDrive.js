import { google } from "googleapis";

// ID folder Google Drive utama (root) tempat semua Naskah Dinas disimpan.
// Struktur di dalamnya dibuat otomatis oleh aplikasi:
//   Folder utama / <Periode> / <NIP - Nama Pegawai> / <file PDF>
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

// PENTING: Drive di sini SENGAJA tidak memakai Service Account (beda dengan
// Google Sheets di lib/googleSheets.js). Service Account tidak punya kuota
// penyimpanan sendiri di Google Drive ("Service Accounts do not have
// storage quota"), jadi ia tidak bisa membuat file/folder baru di akun
// Gmail pribadi biasa. Sebagai gantinya, Drive memakai OAuth atas nama akun
// Google Anda sendiri — lihat app/api/auth/google-drive/start (alur
// menghubungkan sekali di awal untuk mendapatkan refresh token).
function getOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Kredensial OAuth Google Drive belum diatur. Pastikan GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, dan GOOGLE_OAUTH_REDIRECT_URI sudah diisi."
    );
  }
  if (!refreshToken) {
    throw new Error(
      "GOOGLE_OAUTH_REFRESH_TOKEN belum diatur. Buka halaman /api/auth/google-drive/start (setelah login) untuk menghubungkan akun Google Drive Anda satu kali."
    );
  }

  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getOAuthClient() });
}

/** Menghasilkan URL Google untuk meminta izin akses Drive (langkah 1 OAuth). */
export function getGoogleDriveAuthUrl() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Kredensial OAuth Google Drive belum diatur. Pastikan GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, dan GOOGLE_OAUTH_REDIRECT_URI sudah diisi."
    );
  }
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    // "consent" dipaksa supaya Google selalu mengirim refresh_token baru,
    // bukan cuma pada kali pertama menghubungkan akun.
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });
}

/** Menukar kode otorisasi dari Google menjadi token (langkah 2 OAuth). */
export async function exchangeGoogleDriveAuthCode(code) {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** Mencari sub-folder bernama `name` langsung di dalam `parentId`. */
async function findFolder(drive, name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name = '${safeName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0] || null;
}

/** Membuat sub-folder baru bernama `name` di dalam `parentId`. */
async function createFolder(drive, name, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id, name",
    supportsAllDrives: true,
  });
  return res.data;
}

/** Mencari folder bernama `name` di dalam `parentId`; kalau belum ada, dibuat. */
async function findOrCreateFolder(drive, name, parentId) {
  const existing = await findFolder(drive, name, parentId);
  if (existing) return existing.id;
  const created = await createFolder(drive, name, parentId);
  return created.id;
}

/**
 * Menyiapkan (mencari atau membuat) rantai folder:
 *   Folder utama / <periode> / <NIP - Nama>
 * dan mengembalikan ID folder pegawai tersebut, siap dipakai untuk upload.
 */
export async function getPegawaiFolderId(periode, nip, nama) {
  if (!ROOT_FOLDER_ID) {
    throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID belum diatur di environment variables.");
  }
  const drive = getDriveClient();
  const periodeFolderId = await findOrCreateFolder(drive, periode, ROOT_FOLDER_ID);
  const namaFolder = `${nip} - ${nama}`.trim();
  const pegawaiFolderId = await findOrCreateFolder(drive, namaFolder, periodeFolderId);
  return pegawaiFolderId;
}

/**
 * Mengunggah satu file (buffer) ke dalam folder `folderId`, membuatnya bisa
 * dibuka oleh siapa saja yang punya link (viewer), lalu mengembalikan info
 * filenya termasuk link untuk disimpan ke spreadsheet.
 */
export async function uploadFileToDrive({ folderId, filename, mimeType, buffer }) {
  const drive = getDriveClient();

  const { Readable } = await import("stream");
  const stream = Readable.from(buffer);

  const created = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  // Naskah dinas ini perlu bisa dibuka lewat link (misalnya untuk verifikasi),
  // jadi izin dibuka jadi "siapa saja yang punya link, hanya bisa lihat".
  await drive.permissions.create({
    fileId: created.data.id,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  // Ambil ulang link-nya (webViewLink kadang baru lengkap setelah permission diset).
  const final = await drive.files.get({
    fileId: created.data.id,
    fields: "id, name, webViewLink",
    supportsAllDrives: true,
  });

  return {
    id: final.data.id,
    name: final.data.name,
    link: final.data.webViewLink,
  };
}

/**
 * Menghapus satu file dari Drive berdasarkan link webView-nya (best-effort —
 * dipakai saat pengguna menghapus satu bukti dukung). Mengembalikan false
 * (tanpa error) kalau link-nya tidak mengandung ID file yang bisa dikenali.
 */
export async function deleteFileFromDriveByLink(link) {
  const match = String(link || "").match(/\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = match ? match[1] : null;
  if (!fileId) return false;

  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
  return true;
}
