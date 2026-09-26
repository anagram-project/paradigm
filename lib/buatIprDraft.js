import { google } from "googleapis";

// --- Draft "Buat IPR" ---
// Satu TAB per periode (triwulan), dibuat otomatis saat pertama kali ada
// yang menyimpan di periode itu — pola sama dengan lib/koreksiNilai.js.
// Nama tab: "BuatIPR - <Periode>", mis. "BuatIPR - Triwulan II 2026".
// SATU BARIS per pegawai (dicari berdasarkan NIP). Isi HASIL KERJA, PERILAKU
// KERJA, dan USULAN PELATIHAN disimpan sebagai teks JSON per kolom supaya
// jumlah baris di tiap bagian bisa berbeda-beda per pegawai tanpa perlu
// kolom sebanyak IKI terbanyak.

const TAB_PREFIX = process.env.IPR_DRAFT_SHEET_TAB_PREFIX || "BuatIPR - ";

const HEADER = [
  "NIP",
  "Nama",
  "Jabatan",
  "Unit Eselon IV",
  "Unit Eselon III",
  "Unit Eselon II",
  "Tanggal Tandatangan",
  "Hasil Kerja (JSON)",
  "Perilaku Kerja (JSON)",
  "Usulan Pelatihan (JSON)",
  "Kesimpulan",
  "Diperbarui Pada",
];
const TOTAL_COLS = HEADER.length;

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

function colLetter(oneBasedIndex) {
  let n = oneBasedIndex;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function tabNameForPeriode(periode) {
  return `${TAB_PREFIX}${periode}`;
}

function quotedRange(tabName, a1) {
  return `'${tabName.replace(/'/g, "''")}'!${a1}`;
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function safeJsonParse(text, fallback) {
  try {
    const parsed = JSON.parse(text);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function listSheetTitles(sheets) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties.title",
  });
  return (res.data.sheets || []).map((s) => s.properties.title);
}

async function ensurePeriodeTab(sheets, periode) {
  const tabName = tabNameForPeriode(periode);
  const titles = await listSheetTitles(sheets);
  if (titles.includes(tabName)) return tabName;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `A1:${colLetter(TOTAL_COLS)}1`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [HEADER] },
  });
  return tabName;
}

async function readTabRows(sheets, tabName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `A2:${colLetter(TOTAL_COLS)}`),
  });
  const rows = res.data.values || [];
  return rows.map((row, i) => ({ rowNumber: i + 2, row }));
}

function findRowByNip(rows, nip) {
  const target = toText(nip);
  return rows.find(({ row }) => toText(row[0]) === target) || null;
}

/** Menyimpan (membuat baru / menimpa) draft IPR satu pegawai untuk satu periode. */
export async function saveDraft({
  nip,
  nama,
  jabatan,
  es4,
  es3,
  es2,
  periode,
  tanggalTtd,
  hasilKerja,
  perilakuKerja,
  pelatihan,
  kesimpulan,
}) {
  const sheets = getSheetsClient();
  const tabName = await ensurePeriodeTab(sheets, periode);
  const rows = await readTabRows(sheets, tabName);
  const found = findRowByNip(rows, nip);

  const now = new Date().toISOString();
  const values = [
    toText(nip),
    toText(nama),
    toText(jabatan),
    toText(es4),
    toText(es3),
    toText(es2),
    toText(tanggalTtd),
    JSON.stringify(hasilKerja || []),
    JSON.stringify(perilakuKerja || {}),
    JSON.stringify(pelatihan || []),
    toText(kesimpulan),
    now,
  ];

  if (found) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: quotedRange(tabName, `A${found.rowNumber}:${colLetter(TOTAL_COLS)}${found.rowNumber}`),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [values] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: quotedRange(tabName, "A:A"),
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [values] },
    });
  }

  return { savedAt: now };
}

/** Memuat draft IPR satu pegawai untuk satu periode. null kalau belum pernah disimpan. */
export async function loadDraft({ nip, periode }) {
  const sheets = getSheetsClient();
  const tabName = tabNameForPeriode(periode);
  const titles = await listSheetTitles(sheets);
  if (!titles.includes(tabName)) return null;

  const rows = await readTabRows(sheets, tabName);
  const found = findRowByNip(rows, nip);
  if (!found) return null;

  const row = found.row;
  return {
    nip: toText(row[0]),
    nama: toText(row[1]),
    jabatan: toText(row[2]),
    es4: toText(row[3]),
    es3: toText(row[4]),
    es2: toText(row[5]),
    tanggalTtd: toText(row[6]),
    hasilKerja: safeJsonParse(row[7], []),
    perilakuKerja: safeJsonParse(row[8], {}),
    pelatihan: safeJsonParse(row[9], []),
    kesimpulan: toText(row[10]),
    diperbaruiPada: toText(row[11]),
  };
}
