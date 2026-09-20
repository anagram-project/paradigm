import { google } from "googleapis";

// --- Struktur penyimpanan "Manajemen Koreksi Nilai" ---
// Satu TAB per periode (triwulan), dibuat otomatis oleh aplikasi saat
// pertama kali ada yang menyimpan data di periode itu. Nama tabnya:
//   "KoreksiNilai - <Periode>"  misal "KoreksiNilai - Triwulan III 2026"
//
// Di dalam satu tab, SATU BARIS per pegawai. Kolomnya:
//   A: Nama Pegawai   B: NIP   C: Jabatan   D: Unit Kerja
//   Lalu untuk tiap Faktor (1-4), 4 kolom berurutan:
//     <Faktor> Judul | <Faktor> Nama File | <Faktor> LinkFile | <Faktor> DiperbaruiPada
//   Faktor 1: E-H   Faktor 2: I-L   Faktor 3: M-P   Faktor 4: Q-T
//
// Karena tiap Faktor punya 3 slot bukti dukung tapi cuma 1 kolom Judul (dan
// 1 kolom Nama File / LinkFile), ketiga slotnya digabung dalam satu sel,
// dipisah baris baru, dengan format "1. ...\n2. ...\n3. ...".

const TAB_PREFIX = process.env.KOREKSI_SHEET_TAB_PREFIX || "KoreksiNilai - ";
const FAKTOR_COUNT = 4;
const SLOT_COUNT = 3;
const META_COLS = 4; // Nama, NIP, Jabatan, Unit Kerja
const COLS_PER_FAKTOR = 4; // Judul, NamaFile, LinkFile, DiperbaruiPada
const TOTAL_COLS = META_COLS + FAKTOR_COUNT * COLS_PER_FAKTOR; // 20 -> kolom A..T

const HEADER_ROW = (() => {
  const header = ["Nama Pegawai", "NIP", "Jabatan", "Unit Kerja"];
  for (let f = 1; f <= FAKTOR_COUNT; f++) {
    header.push(`Faktor ${f} Judul`, `Faktor ${f} Nama File`, `Faktor ${f} LinkFile`, `Faktor ${f} DiperbaruiPada`);
  }
  return header;
})();

function colLetter(oneBasedIndex) {
  // Cukup A..Z karena total kolom kita (20) tidak pernah lewat 26.
  return String.fromCharCode(64 + oneBasedIndex);
}

// Kolom pertama (Judul) dari satu Faktor, 1-based.
function faktorStartCol(faktor) {
  return META_COLS + (faktor - 1) * COLS_PER_FAKTOR + 1;
}

function tabNameForPeriode(periode) {
  return `${TAB_PREFIX}${periode}`;
}

function quotedRange(tabName, a1) {
  // Nama tab mengandung spasi, jadi wajib dibungkus tanda kutip tunggal.
  return `'${tabName.replace(/'/g, "''")}'!${a1}`;
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function combineSlots(values) {
  const arr = [values[0] || "", values[1] || "", values[2] || ""];
  return arr.map((v, i) => `${i + 1}. ${v}`).join("\n");
}

function parseSlots(cellText) {
  const result = ["", "", ""];
  String(cellText || "")
    .split("\n")
    .forEach((line) => {
      const m = line.match(/^([1-3])\.\s?(.*)$/);
      if (m) result[Number(m[1]) - 1] = m[2];
    });
  return result;
}

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
  return new google.auth.JWT({
    email,
    key,
    // Beda dari login (readonly) — fitur ini perlu menulis baris baru & tab baru.
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getWriteAuth() });
}

function getSpreadsheetId() {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID belum diatur di environment variables.");
  return id;
}

let sheetTitlesCache = null;
async function listSheetTitles(sheets, { fresh = false } = {}) {
  if (sheetTitlesCache && !fresh) return sheetTitlesCache;
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties.title",
  });
  sheetTitlesCache = (res.data.sheets || []).map((s) => s.properties.title);
  return sheetTitlesCache;
}

/** Memastikan tab periode ini ada; kalau belum, membuatnya lengkap dengan header. */
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
    requestBody: { values: [HEADER_ROW] },
  });
  sheetTitlesCache = null; // paksa refresh di pemanggilan berikutnya
  return tabName;
}

/** Membaca semua baris satu tab periode (tanpa header), lengkap nomor barisnya. */
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
  return rows.find(({ row }) => toText(row[1]) === target) || null;
}

/** Mencari/membuat baris pegawai di tab periode tsb, mengembalikan nomor barisnya. */
async function ensurePegawaiRow(sheets, tabName, { nip, nama, jabatan, unitKerja }) {
  const rows = await readTabRows(sheets, tabName);
  const found = findRowByNip(rows, nip);
  if (found) {
    // Perbarui data identitas kalau ada perubahan (nama/jabatan/unit kerja).
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: quotedRange(tabName, `A${found.rowNumber}:D${found.rowNumber}`),
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[nama, nip, jabatan || "", unitKerja || ""]] },
    });
    return found.rowNumber;
  }

  const blankFaktorCols = new Array(FAKTOR_COUNT * COLS_PER_FAKTOR).fill("");
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, "A:D"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [[nama, nip, jabatan || "", unitKerja || "", ...blankFaktorCols]] },
  });
  const refreshed = await readTabRows(sheets, tabName);
  const justAdded = findRowByNip(refreshed, nip);
  return justAdded.rowNumber;
}

/** Mengambil isi kolom Judul/NamaFile/LinkFile untuk satu Faktor pada satu baris. */
function readFaktorBlock(row, faktor) {
  const start = faktorStartCol(faktor) - 1; // ke index array (0-based)
  return {
    judul: toText(row[start]),
    namaFile: toText(row[start + 1]),
    linkFile: toText(row[start + 2]),
  };
}

/**
 * Mengambil 12 entri (Faktor 1-4 x Nomor 1-3) milik satu pegawai untuk satu
 * periode. Kalau tab periode/baris pegawainya belum ada, semua dianggap
 * kosong (bukan error) — supaya halaman tetap bisa dibuka untuk periode baru.
 */
export async function getEntriesForUser(nip, periode) {
  const sheets = getSheetsClient();
  const tabName = tabNameForPeriode(periode);
  const titles = await listSheetTitles(sheets);
  if (!titles.includes(tabName)) return [];

  const rows = await readTabRows(sheets, tabName);
  const found = findRowByNip(rows, nip);

  const entries = [];
  for (let f = 1; f <= FAKTOR_COUNT; f++) {
    const block = found ? readFaktorBlock(found.row, f) : { judul: "", namaFile: "", linkFile: "" };
    const judulSlots = parseSlots(block.judul);
    const namaFileSlots = parseSlots(block.namaFile);
    const linkFileSlots = parseSlots(block.linkFile);
    for (let n = 1; n <= SLOT_COUNT; n++) {
      entries.push({
        faktor: String(f),
        nomorUrut: String(n),
        judul: judulSlots[n - 1],
        namaFile: namaFileSlots[n - 1],
        linkFile: linkFileSlots[n - 1],
      });
    }
  }
  return entries;
}

/**
 * Mengecek apakah `judul` ini sudah pernah dipakai pegawai yang sama di
 * PERIODE LAIN (tab lain), di Faktor mana pun. Mengembalikan nama periode
 * yang bentrok, atau null kalau aman.
 */
async function findJudulBentrok(sheets, { nip, periodeSekarang, judul }) {
  const target = toText(judul).toLowerCase();
  if (!target) return null;

  const titles = await listSheetTitles(sheets);
  const tabSekarang = tabNameForPeriode(periodeSekarang);
  const tabLain = titles.filter((t) => t.startsWith(TAB_PREFIX) && t !== tabSekarang);

  for (const tabName of tabLain) {
    const rows = await readTabRows(sheets, tabName);
    const found = findRowByNip(rows, nip);
    if (!found) continue;
    for (let f = 1; f <= FAKTOR_COUNT; f++) {
      const block = readFaktorBlock(found.row, f);
      const slots = parseSlots(block.judul);
      if (slots.some((s) => s.trim().toLowerCase() === target)) {
        return tabName.slice(TAB_PREFIX.length);
      }
    }
  }
  return null;
}

/**
 * Menyimpan/mengubah judul satu slot bukti dukung (1 dari 3) pada satu
 * Faktor, untuk pegawai & periode tertentu. Slot lain di Faktor yang sama
 * tidak ikut berubah. Melempar error kalau judul ini sudah pernah dipakai
 * di periode lain.
 */
export async function upsertJudul({ nip, nama, jabatan, unitKerja, periode, faktor, nomorUrut, judul }) {
  const sheets = getSheetsClient();

  const bentrokDi = await findJudulBentrok(sheets, { nip, periodeSekarang: periode, judul });
  if (bentrokDi) {
    const err = new Error(
      `Naskah Dinas ini sudah pernah dipakai pada periode ${bentrokDi} dan tidak dapat digunakan kembali.`
    );
    err.code = "JUDUL_BENTROK";
    throw err;
  }

  const tabName = await ensurePeriodeTab(sheets, periode);
  const rowNumber = await ensurePegawaiRow(sheets, tabName, { nip, nama, jabatan, unitKerja });

  const rows = await readTabRows(sheets, tabName);
  const current = rows.find((r) => r.rowNumber === rowNumber);
  const block = readFaktorBlock(current.row, Number(faktor));
  const slots = parseSlots(block.judul);
  slots[Number(nomorUrut) - 1] = judul;

  const startCol = faktorStartCol(Number(faktor));
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `${colLetter(startCol)}${rowNumber}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[combineSlots(slots)]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `${colLetter(startCol + 3)}${rowNumber}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[now]] },
  });
}

/**
 * Menyimpan link + nama file naskah dinas hasil upload ke Drive, untuk satu
 * slot bukti dukung. Slot lain di Faktor yang sama tidak ikut berubah.
 */
export async function upsertFileLink({
  nip,
  nama,
  jabatan,
  unitKerja,
  periode,
  faktor,
  nomorUrut,
  linkFile,
  namaFile,
}) {
  const sheets = getSheetsClient();
  const tabName = await ensurePeriodeTab(sheets, periode);
  const rowNumber = await ensurePegawaiRow(sheets, tabName, { nip, nama, jabatan, unitKerja });

  const rows = await readTabRows(sheets, tabName);
  const current = rows.find((r) => r.rowNumber === rowNumber);
  const block = readFaktorBlock(current.row, Number(faktor));
  const namaFileSlots = parseSlots(block.namaFile);
  const linkFileSlots = parseSlots(block.linkFile);
  namaFileSlots[Number(nomorUrut) - 1] = namaFile;
  linkFileSlots[Number(nomorUrut) - 1] = linkFile;

  const startCol = faktorStartCol(Number(faktor));
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `${colLetter(startCol + 1)}${rowNumber}:${colLetter(startCol + 2)}${rowNumber}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[combineSlots(namaFileSlots), combineSlots(linkFileSlots)]] },
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `${colLetter(startCol + 3)}${rowNumber}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[now]] },
  });
}
