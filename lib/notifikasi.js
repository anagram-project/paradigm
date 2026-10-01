import { google } from "googleapis";

// --- Notifikasi aplikasi (menu "Menu Khusus Admin Aplikasi" > "Update/Edit
// Notifikasi") ---
// Disimpan di spreadsheet utama PARADIGM (GOOGLE_SHEET_ID, sama dengan data
// pegawai), pada tab/sheet terpisah bernama "Notifikasi" — dibuat otomatis
// kalau belum ada. Menggunakan Service Account dengan scope TULIS (sama
// seperti lib/pegawaiAdmin.js), bukan scope readonly di lib/googleSheets.js.
//
// Kolom tab "Notifikasi":
//   A ID | B Judul | C Isi | D Aktif (TRUE/FALSE) | E DibuatPada | F DiubahPada
//
// Hanya notifikasi dengan Aktif=TRUE yang dihitung & ditampilkan di dropdown
// lonceng notifikasi header (untuk SEMUA role) — lihat listNotifikasiAktif().
// Pengelolaan penuh (tambah/ubah/hapus/aktif-nonaktifkan semua notifikasi,
// termasuk yang nonaktif) hanya untuk Admin KKPA lewat halaman
// /dashboard/notifikasi-admin — pembatasan role dilakukan di route handler,
// bukan di sini.

const SHEET_TAB = "Notifikasi";
const HEADER = ["ID", "Judul", "Isi", "Aktif", "DibuatPada", "DiubahPada"];

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

function quotedRange(a1) {
  return `'${SHEET_TAB.replace(/'/g, "''")}'!${a1}`;
}

async function getSheetsMeta(sheets) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  return (res.data.sheets || []).map((s) => s.properties);
}

/** Memastikan tab "Notifikasi" tersedia (dibuat + diberi header kalau belum ada). */
async function ensureNotifikasiTab(sheets) {
  const metas = await getSheetsMeta(sheets);
  const existing = metas.find((m) => m.title === SHEET_TAB);
  if (existing) return existing.sheetId;

  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: SHEET_TAB } } }] },
  });
  const sheetId = res.data.replies[0].addSheet.properties.sheetId;

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange("A1:F1"),
    valueInputOption: "RAW",
    requestBody: { values: [HEADER] },
  });

  return sheetId;
}

async function readAllRows(sheets) {
  await ensureNotifikasiTab(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange("A2:F"),
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0])
    .map((row) => ({
      id: toText(row[0]),
      judul: toText(row[1]),
      isi: toText(row[2]),
      aktif: toText(row[3]).toUpperCase() === "TRUE",
      dibuatPada: toText(row[4]),
      diubahPada: toText(row[5]),
    }));
}

async function writeAllRows(sheets, items) {
  // Bersihkan dulu seluruh baris data (bukan header), lalu tulis ulang
  // penuh — lebih sederhana & tetap aman untuk jumlah notifikasi yang wajar
  // (pola yang sama dipakai lib/kualitasIkuProjects.js untuk save ulang).
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange("A2:F"),
  });

  if (items.length === 0) return;

  const values = items.map((n) => [n.id, n.judul, n.isi, n.aktif ? "TRUE" : "FALSE", n.dibuatPada, n.diubahPada]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(`A2:F${values.length + 1}`),
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/** Semua notifikasi (aktif maupun nonaktif), terbaru dulu — untuk halaman admin. */
export async function listNotifikasi() {
  const sheets = getSheetsClient();
  const items = await readAllRows(sheets);
  return items.sort((a, b) => (b.dibuatPada || "").localeCompare(a.dibuatPada || ""));
}

/** Hanya notifikasi yang Aktif=TRUE, terbaru dulu — untuk lonceng notifikasi header (semua role). */
export async function listNotifikasiAktif() {
  const items = await listNotifikasi();
  return items.filter((n) => n.aktif);
}

/** Menambah notifikasi baru. */
export async function createNotifikasi({ judul, isi, aktif = true }) {
  const sheets = getSheetsClient();
  const items = await readAllRows(sheets);
  const now = new Date().toISOString();

  const baru = {
    id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    judul: toText(judul),
    isi: toText(isi),
    aktif: !!aktif,
    dibuatPada: now,
    diubahPada: now,
  };

  if (!baru.judul) {
    const err = new Error("Judul notifikasi wajib diisi.");
    err.code = "INVALID";
    throw err;
  }

  items.push(baru);
  await writeAllRows(sheets, items);
  return baru;
}

/** Mengubah notifikasi yang sudah ada (dicari berdasarkan ID). */
export async function updateNotifikasi(id, patch = {}) {
  const sheets = getSheetsClient();
  const items = await readAllRows(sheets);
  const targetId = toText(id);
  const idx = items.findIndex((n) => n.id === targetId);

  if (idx === -1) {
    const err = new Error("Notifikasi tidak ditemukan.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const current = items[idx];
  const updated = {
    ...current,
    judul: patch.judul !== undefined ? toText(patch.judul) : current.judul,
    isi: patch.isi !== undefined ? toText(patch.isi) : current.isi,
    aktif: patch.aktif !== undefined ? !!patch.aktif : current.aktif,
    diubahPada: new Date().toISOString(),
  };

  if (!updated.judul) {
    const err = new Error("Judul notifikasi wajib diisi.");
    err.code = "INVALID";
    throw err;
  }

  items[idx] = updated;
  await writeAllRows(sheets, items);
  return updated;
}

/** Menghapus permanen satu notifikasi. */
export async function deleteNotifikasi(id) {
  const sheets = getSheetsClient();
  const items = await readAllRows(sheets);
  const targetId = toText(id);
  const filtered = items.filter((n) => n.id !== targetId);

  if (filtered.length === items.length) {
    const err = new Error("Notifikasi tidak ditemukan.");
    err.code = "NOT_FOUND";
    throw err;
  }

  await writeAllRows(sheets, filtered);
  return { id: targetId };
}
