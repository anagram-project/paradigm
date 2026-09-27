import { google } from "googleapis";

// --- Update/Edit Data Pegawai (menu Pengaturan) ---
// Menulis balik ke tab data pegawai (Sheet1, sama dengan sumber data login)
// menggunakan Service Account dengan scope TULIS (beda dari lib/googleSheets.js
// yang readonly). Sengaja dipisah supaya lib/googleSheets.js — yang dipakai
// dari flow login — tidak perlu scope tulis sama sekali.
//
// Kolom Sheet1 (lihat juga lib/googleSheets.js):
//   A Nama | B NIP | C Jabatan | D Pangkat | E Golongan | F Unit Kerja
//   G Es4  | H Es3 | I Es2     | J Es1     | K Password | L Role
// NIP (kolom B) & Password (kolom K) TIDAK PERNAH diubah lewat fitur ini —
// NIP adalah kunci yang dipakai untuk mencocokkan data pegawai di seluruh
// tab lain (ReferensiIKI, draft IPR, dsb), dan Password diatur lewat jalur
// terpisah demi keamanan.

const SHEET_TAB = process.env.GOOGLE_SHEET_TAB || "Sheet1";
const RANGE_ALL = `${SHEET_TAB}!A2:L`;

function getPrivateKey() {
  const base64Key = process.env.GOOGLE_PRIVATE_KEY_BASE64;
  if (base64Key) return Buffer.from(base64Key, "base64").toString("utf8");
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (rawKey) return rawKey.replace(/\\n/g, "\n");
  return null;
}

function getWriteAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = getPrivateKey();
  if (!email || !key) {
    throw new Error(
      "Kredensial Google Service Account belum diatur. Pastikan GOOGLE_SERVICE_ACCOUNT_EMAIL dan GOOGLE_PRIVATE_KEY_BASE64 sudah diisi."
    );
  }
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getWriteAuth() });
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID belum diatur di environment variables.");
  return id;
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

/**
 * Memperbarui satu baris data pegawai (dicari berdasarkan NIP). `patch`
 * hanya boleh berisi field yang memang boleh diubah oleh pemanggil — filter
 * berdasarkan role (Admin KKPA vs LO Subdit) dilakukan di route handler
 * SEBELUM memanggil fungsi ini, bukan di sini, supaya fungsi ini tetap
 * sederhana (dia percaya penuh pada `patch` yang diberikan). Field yang
 * tidak disertakan di `patch` (undefined) dibiarkan sama seperti nilai lama.
 */
export async function updatePegawaiByNip(nip, patch = {}) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGE_ALL });
  const rows = res.data.values || [];
  const targetNip = toText(nip);
  const idx = rows.findIndex((r) => toText(r[1]) === targetNip);

  if (idx === -1) {
    const err = new Error("Data pegawai dengan NIP tersebut tidak ditemukan.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const current = rows[idx];
  const rowNumber = idx + 2; // range dimulai dari baris 2 (A2)

  const pick = (key, colIndex) => (patch[key] !== undefined ? toText(patch[key]) : toText(current[colIndex]));

  const merged = [
    pick("nama", 0),
    toText(current[1]), // NIP — tidak pernah diubah lewat fitur ini
    pick("jabatan", 2),
    pick("pangkat", 3),
    pick("golongan", 4),
    pick("unitKerja", 5),
    pick("es4", 6),
    pick("es3", 7),
    pick("es2", 8),
    pick("es1", 9),
    toText(current[10]), // Password — tidak pernah diubah lewat fitur ini
    pick("role", 11),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TAB.replace(/'/g, "''")}'!A${rowNumber}:L${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [merged] },
  });

  return { nip: merged[1] };
}
