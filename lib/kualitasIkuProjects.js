import { google } from "googleapis";

// --- Penyimpanan proyek simulasi "Design Kualitas IKU & Simulasi K3" ---
// Disimpan di SPREADSHEET TERPISAH dari data utama PARADIGM (Sheet ID
// diatur lewat env var GOOGLE_SIMULASI_SHEET_ID), supaya tidak bercampur
// dengan data pegawai/koreksi nilai. Satu WORKBOOK berisi semua proyek,
// tapi tiap proyek punya TAB (sheet) sendiri — nama tab = nama proyek.
//
// Struktur tiap tab (dibuat & ditulis ulang penuh tiap kali disimpan):
//   Baris 1 (header meta) : NamaProyek | Kedudukan | JabatanSKP | SkalaJabatan | MinIKU | MaxIKU | JumlahIKU | DisimpanPada
//   Baris 2 (nilai meta)  : ...
//   Baris 3               : (kosong)
//   Baris 4 (header IKI)  : Nama IKU/IKI | Validitas | Kendali | Polarisasi | JenisHistoris | TargetY1 | RealY1 | TargetY | BandValue | StabilizeMemenuhiKriteria | BobotBaruManual | Mandatory | RealY | IndeksCapaian | JumlahHari
//   Baris 5..(4+n)         : satu baris per IKI
//   Baris (5+n)            : (kosong)
//   Baris (6+n) (header NPK): 7 kolom Core Value BerAKHLAK
//   Baris (7+n) (nilai NPK) : ...
//
// JumlahIKU pada baris meta dipakai untuk tahu berapa baris IKI yang harus
// dibaca kembali saat memuat proyek (supaya lokasi blok NPK di bawahnya
// bisa dihitung dengan pasti).

const META_HEADER = [
  "NamaProyek",
  "Kedudukan",
  "JabatanSKP",
  "SkalaJabatan",
  "MinIKU",
  "MaxIKU",
  "JumlahIKU",
  "DisimpanPada",
];

const IKI_HEADER = [
  "Nama IKU/IKI",
  "Validitas",
  "Kendali",
  "Polarisasi",
  "JenisHistoris",
  "TargetY1",
  "RealY1",
  "TargetY",
  "BandValue",
  "StabilizeMemenuhiKriteria",
  "BobotBaruManual",
  "Mandatory",
  "RealY",
  "IndeksCapaian",
  "JumlahHari",
];

const NPK_HEADER = [
  "berorientasiPelayanan",
  "akuntabel",
  "kompeten",
  "harmonis",
  "loyal",
  "adaptif",
  "kolaboratif",
];

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
  const id = process.env.GOOGLE_SIMULASI_SHEET_ID;
  if (!id) {
    throw new Error(
      "GOOGLE_SIMULASI_SHEET_ID belum diatur di environment variables. Buat spreadsheet baru khusus untuk proyek simulasi Design Kualitas IKU, share ke email Service Account yang sama (GOOGLE_SERVICE_ACCOUNT_EMAIL) sebagai Editor, lalu isi ID spreadsheet-nya di env var ini."
    );
  }
  return id;
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function sanitizeTabName(name) {
  const cleaned = String(name || "")
    .trim()
    .replace(/[\[\]\*\?\/\\:]/g, "-")
    .slice(0, 95);
  return cleaned || "Proyek Tanpa Nama";
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

function quotedRange(tabName, a1) {
  return `'${tabName.replace(/'/g, "''")}'!${a1}`;
}

async function listSheetTitles(sheets) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties.title",
  });
  return (res.data.sheets || []).map((s) => s.properties.title);
}

async function ensureTab(sheets, tabName, titles) {
  if (titles.includes(tabName)) return;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
  });
}

/** Daftar semua proyek simulasi (nama tab) yang tersimpan di workbook. */
export async function listProjects() {
  const sheets = getSheetsClient();
  const titles = await listSheetTitles(sheets);
  return titles;
}

/** Menyimpan (membuat baru / menimpa penuh) satu proyek simulasi. */
export async function saveProject({
  projectName,
  kedudukan,
  jabatanSkp,
  jabatanScale,
  minIku,
  maxIku,
  ikiList,
  npkValues,
}) {
  const tabName = sanitizeTabName(projectName);
  const sheets = getSheetsClient();
  const titles = await listSheetTitles(sheets);
  await ensureTab(sheets, tabName, titles);

  const n = ikiList.length;
  const savedAt = new Date().toISOString();

  const metaRows = [
    META_HEADER,
    [projectName, kedudukan, jabatanSkp, jabatanScale, minIku, maxIku, n, savedAt],
    [],
    IKI_HEADER,
  ];

  const ikiRows = ikiList.map((r) => [
    r.namaIki || "",
    r.validitas || "",
    r.kendali || "",
    r.polarisasi || "",
    r.jenisHistoris || "",
    r.targetY1 ?? "",
    r.realY1 ?? "",
    r.targetY ?? "",
    r.bandValue ?? "",
    r.stabilizeMemenuhiKriteria ? "TRUE" : "FALSE",
    r.bobotBaruManual ?? "",
    r.mandatory ? "TRUE" : "FALSE",
    r.realY ?? "",
    r.indeksCapaian ?? "",
    r.jumlahHari ?? "",
  ]);

  const npkRows = [[], NPK_HEADER, NPK_HEADER.map((k) => npkValues[k] ?? "")];

  const allRows = [...metaRows, ...ikiRows, ...npkRows];
  const totalCols = Math.max(META_HEADER.length, IKI_HEADER.length, NPK_HEADER.length);

  // Bersihkan seluruh isi tab dulu supaya save ulang dengan jumlah baris
  // yang lebih sedikit dari sebelumnya tidak menyisakan data lama.
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSpreadsheetId(),
    range: `'${tabName.replace(/'/g, "''")}'`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `A1:${colLetter(totalCols)}${allRows.length}`),
    valueInputOption: "USER_ENTERED",
    requestBody: { values: allRows },
  });

  return { tabName, savedAt };
}

/** Memuat kembali satu proyek simulasi berdasarkan nama tab-nya. */
export async function loadProject(projectName) {
  const tabName = sanitizeTabName(projectName);
  const sheets = getSheetsClient();
  const titles = await listSheetTitles(sheets);
  if (!titles.includes(tabName)) {
    const err = new Error(`Proyek "${projectName}" tidak ditemukan.`);
    err.code = "NOT_FOUND";
    throw err;
  }

  // Ambil rentang yang cukup besar sekaligus (sampai 500 baris) supaya tidak
  // perlu tahu jumlah baris IKI di muka.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(tabName, `A1:${colLetter(15)}500`),
  });
  const rows = res.data.values || [];

  const metaValues = rows[1] || [];
  const jumlahIku = Number(metaValues[6]) || 0;

  const ikiList = [];
  for (let i = 0; i < jumlahIku; i++) {
    const row = rows[4 + i] || [];
    ikiList.push({
      id: `${Date.now()}-${i}-${Math.random()}`,
      namaIki: toText(row[0]),
      validitas: toText(row[1]),
      kendali: toText(row[2]),
      polarisasi: toText(row[3]) || "maximize",
      jenisHistoris: toText(row[4]) || "lama",
      targetY1: toText(row[5]),
      realY1: toText(row[6]),
      targetY: toText(row[7]),
      bandValue: row[8] !== undefined && row[8] !== "" ? Number(row[8]) : null,
      stabilizeMemenuhiKriteria: toText(row[9]) === "TRUE",
      bobotBaruManual: row[10] !== undefined && row[10] !== "" ? Number(row[10]) : 1,
      mandatory: toText(row[11]) === "TRUE",
      realY: toText(row[12]),
      indeksCapaian: toText(row[13]),
      jumlahHari: toText(row[14]) || 91,
    });
  }

  const npkHeaderRowIndex = 4 + jumlahIku + 1; // baris kosong setelah IKI
  const npkValuesRow = rows[npkHeaderRowIndex + 1] || [];
  const npkValues = {};
  NPK_HEADER.forEach((key, i) => {
    npkValues[key] = npkValuesRow[i] !== undefined && npkValuesRow[i] !== "" ? Number(npkValuesRow[i]) : 100;
  });

  return {
    projectName: toText(metaValues[0]) || projectName,
    kedudukan: toText(metaValues[1]),
    jabatanSkp: toText(metaValues[2]),
    jabatanScale: toText(metaValues[3]) || "lain",
    minIku: Number(metaValues[4]) || null,
    maxIku: Number(metaValues[5]) || null,
    savedAt: toText(metaValues[7]),
    ikiList,
    npkValues,
  };
}
