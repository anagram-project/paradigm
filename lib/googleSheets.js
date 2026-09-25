import { google } from "googleapis";
import { normalizeRole } from "./roles";

// Nama tab (sheet) tempat data pengguna disimpan. Bisa dioverride lewat
// environment variable GOOGLE_SHEET_TAB kalau nama tab di spreadsheet Anda
// berbeda dari "Sheet1".
const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Sheet1";

// Kolom yang diharapkan (baris 1 = header, data mulai baris 2):
//   A: Nama Pegawai   B: NIP   C: Jabatan   D: Pangkat   E: Golongan
//   F: Unit Kerja     G: Es4   H: Es3       I: Es2       J: Es1
//   K: Password       L: Role
// Kolom Role diisi salah satu (bebas huruf besar/kecil): "Admin KKPA",
// "LO Subdit", atau "Biasa" (boleh dikosongkan, otomatis dianggap "Biasa").
// Lihat lib/roles.js untuk daftar lengkap variasi teks yang dikenali dan
// menu apa saja yang boleh diakses tiap role.
const USERS_RANGE = `${SHEET_TAB}!A2:L`;

function getPrivateKey() {
  // Cara yang direkomendasikan: private key disimpan sebagai base64 (dihasilkan
  // oleh scripts/read-service-account.js), supaya tidak ada risiko format PEM
  // rusak akibat copy-paste manual (karakter "\n", kutip, dsb).
  const base64Key = process.env.GOOGLE_PRIVATE_KEY_BASE64;
  if (base64Key) {
    return Buffer.from(base64Key, "base64").toString("utf8");
  }

  // Cara lama/alternatif: private key ditempel apa adanya dari file JSON,
  // dengan baris baru disimpan sebagai "\n" literal yang perlu diubah kembali
  // menjadi baris baru sungguhan.
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (rawKey) {
    return rawKey.replace(/\\n/g, "\n");
  }

  return null;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = getPrivateKey();

  if (!email || !key) {
    throw new Error(
      "Kredensial Google Service Account belum diatur. Pastikan GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY_BASE64 (atau GOOGLE_PRIVATE_KEY) sudah diisi di environment variables."
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

function toText(value) {
  return value ? String(value).trim() : "";
}

/**
 * Mengambil semua baris pada sheet data pegawai dan mengubahnya menjadi array objek.
 */
export async function getUsers() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID belum diatur di environment variables.");
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: USERS_RANGE,
  });

  const rows = response.data.values || [];

  return rows
    .filter((row) => row[1]) // lewati baris tanpa NIP
    .map((row) => ({
      nama: toText(row[0]),
      nip: toText(row[1]),
      jabatan: toText(row[2]),
      pangkat: toText(row[3]),
      golongan: toText(row[4]),
      unitKerja: toText(row[5]),
      es4: toText(row[6]),
      es3: toText(row[7]),
      es2: toText(row[8]),
      es1: toText(row[9]),
      password: toText(row[10]),
      role: normalizeRole(row[11]),
    }));
}

/**
 * Mencari satu pengguna berdasarkan NIP.
 */
export async function findUserByNip(nip) {
  const users = await getUsers();
  const target = toText(nip);
  return users.find((user) => user.nip === target) || null;
}
