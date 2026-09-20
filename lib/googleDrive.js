import { google } from "googleapis";

// ID folder Google Drive utama (root) tempat semua Naskah Dinas disimpan.
// Struktur di dalamnya dibuat otomatis oleh aplikasi:
//   Folder utama / <Periode> / <NIP - Nama Pegawai> / <file PDF>
// Folder utama-nya sendiri harus dibagikan (share) ke akun service account
// sebagai "Editor" — sama seperti proses share spreadsheet, lihat README.
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

function getPrivateKey() {
  const base64Key = process.env.GOOGLE_PRIVATE_KEY_BASE64;
  if (base64Key) {
    return Buffer.from(base64Key, "base64").toString("utf8");
  }
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (rawKey) {
    return rawKey.replace(/\\n/g, "\n");
  }
  return null;
}

function getDriveAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = getPrivateKey();
  if (!email || !key) {
    throw new Error(
      "Kredensial Google Service Account belum diatur. Pastikan GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY_BASE64 sudah diisi."
    );
  }
  return new google.auth.JWT({
    email,
    key,
    // Butuh akses baca+tulis penuh ke Drive (bukan cuma "drive.file") supaya
    // service account bisa membuat folder di dalam folder utama yang
    // dimiliki akun Google pengguna, bukan cuma file yang ia buat sendiri.
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDriveClient() {
  return google.drive({ version: "v3", auth: getDriveAuth() });
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
