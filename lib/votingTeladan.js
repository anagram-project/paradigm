import { google } from "googleapis";

// --- Voting "Pemilihan Pegawai Teladan" ---
// Pola sama dengan lib/buatIprDraft.js: satu TAB per periode (triwulan),
// dibuat otomatis saat pertama kali ada yang submit di periode itu. Nama
// tab: "VotingTeladan - <Periode>", mis. "VotingTeladan - Triwulan III 2026".
// SATU BARIS per pegawai (dicari berdasarkan NIP).
//
// Beda penting dari draft IPR: voting ini TERKUNCI setelah submit — begitu
// satu NIP sudah punya baris di tab periode tsb, saveVote() menolak submit
// berikutnya (tidak ada edit/ganti pilihan), sesuai aturan "satu kali pilih,
// tidak bisa diubah".

const TAB_PREFIX = process.env.VOTING_TELADAN_SHEET_TAB_PREFIX || "VotingTeladan - ";

const HEADER = ["NIP", "Nama", "Pilihan 1", "Pilihan 2", "Pilihan 3", "Waktu Submit"];
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

function rowToVote(row) {
  return {
    nip: toText(row[0]),
    nama: toText(row[1]),
    pilihan: [toText(row[2]), toText(row[3]), toText(row[4])].filter(Boolean),
    waktuSubmit: toText(row[5]),
  };
}

/**
 * Status voting satu pegawai untuk satu periode: { sudahMemilih, vote }.
 * `vote` berisi pilihan yang sudah disimpan (null kalau belum pernah voting).
 */
export async function getVotingStatus({ nip, periode }) {
  const sheets = getSheetsClient();
  const tabName = tabNameForPeriode(periode);
  const titles = await listSheetTitles(sheets);
  if (!titles.includes(tabName)) {
    return { sudahMemilih: false, vote: null };
  }

  const rows = await readTabRows(sheets, tabName);
  const found = findRowByNip(rows, nip);
  if (!found) return { sudahMemilih: false, vote: null };

  return { sudahMemilih: true, vote: rowToVote(found.row) };
}

/**
 * Rekap jumlah suara (vote) tiap kandidat untuk satu periode — dipakai oleh
 * menu admin "Penilaian Pegawai Teladan" untuk mengisi kolom "Jumlah Vote
 * (Raw)" secara otomatis dari hasil menu reguler "Pemilihan Pegawai
 * Teladan". Tab yang belum pernah dibuat (belum ada yang voting di periode
 * itu) dianggap tally kosong, bukan error.
 */
export async function getVoteTally({ periode }) {
  const sheets = getSheetsClient();
  const tabName = tabNameForPeriode(periode);
  const titles = await listSheetTitles(sheets);
  if (!titles.includes(tabName)) {
    return { tally: {}, totalPemilih: 0 };
  }

  const rows = await readTabRows(sheets, tabName);
  const tally = {};
  for (const { row } of rows) {
    const vote = rowToVote(row);
    for (const kandidatId of vote.pilihan) {
      tally[kandidatId] = (tally[kandidatId] || 0) + 1;
    }
  }
  return { tally, totalPemilih: rows.length };
}

/**
 * Menyimpan (SEKALI, tidak bisa diubah) pilihan 3 calon pegawai teladan
 * untuk satu pegawai pada satu periode. Menolak (throw) kalau NIP ini
 * sudah pernah submit sebelumnya di periode yang sama.
 */
export async function saveVote({ nip, nama, periode, pilihan }) {
  const uniquePilihan = Array.from(new Set((pilihan || []).map((p) => toText(p)).filter(Boolean)));
  if (uniquePilihan.length !== 3) {
    throw new Error("Pilihan harus tepat 3 calon pegawai teladan yang berbeda.");
  }

  const sheets = getSheetsClient();
  const tabName = await ensurePeriodeTab(sheets, periode);
  const rows = await readTabRows(sheets, tabName);
  const found = findRowByNip(rows, nip);

  if (found) {
    const existing = rowToVote(found.row);
    const error = new Error("Anda sudah memilih untuk periode ini dan pilihan tidak dapat diubah.");
    error.code = "ALREADY_VOTED";
    error.vote = existing;
    throw error;
  }

  const now = new Date().toISOString();
  const values = [toText(nip), toText(nama), ...uniquePilihan, now];

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, "A:A"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });

  return { savedAt: now, pilihan: uniquePilihan };
}
