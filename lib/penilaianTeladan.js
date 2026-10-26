import { google } from "googleapis";
import { hitungSkorKandidat, rankByNilaiFinal } from "./penilaianTeladanSkor";

export { hitungSkorKandidat, rankByNilaiFinal };

// --- Penilaian Pegawai Teladan (menu khusus Admin Aplikasi) ---
// Form perhitungan nilai akhir pegawai teladan, formatnya mengikuti berkas
// "FINAL_Form_Penilaian_Pegawai_Teladan_Dit_PA_Tahun_2025.xlsx" yang
// sebelumnya dipakai manual (5 komponen berbobot 20 masing-masing, total
// 100): a. Disiplin Pegawai (Kerapian Berpakaian + Kepatuhan Jam Kerja),
// b. Integritas Pegawai, c. Kehadiran Pegawai, d. Vote Pegawai (otomatis
// dari lib/votingTeladan.js — lihat gabunganPenilaianTeladan di bawah),
// e. Nilai Kinerja Pegawai.
//
// Disimpan di spreadsheet utama PARADIGM (GOOGLE_SHEET_ID), SATU tab
// bersama "PenilaianTeladan" (pola sama dengan lib/timelineKinerja.js) —
// bukan satu tab per periode seperti voting, karena halaman admin ini
// menyimpan SELURUH baris satu periode sekaligus lewat satu tombol Simpan
// (replace penuh baris periode tsb, periode lain tidak tersentuh).
//
// Kolom tab "PenilaianTeladan":
//   A Periode | B KandidatId | C Nama | D Subdit
//   E KerapianBerpakaian | F KepatuhanJamKerja | G NilaiIntegritas
//   H NilaiKehadiran | I NilaiKinerjaRaw | J DiperbaruiPada
//
// Catatan: kolom "Jumlah Vote" SENGAJA TIDAK disimpan di tab ini — nilainya
// selalu ditarik langsung dari lib/votingTeladan.js (getVoteTally) saat
// data ditampilkan, supaya selalu sinkron dengan hasil Menu Reguler
// "Pemilihan Pegawai Teladan" tanpa perlu disalin manual oleh Admin.

const SHEET_TAB = "PenilaianTeladan";
const HEADER = [
  "Periode",
  "KandidatId",
  "Nama",
  "Subdit",
  "KerapianBerpakaian",
  "KepatuhanJamKerja",
  "NilaiIntegritas",
  "NilaiKehadiran",
  "NilaiKinerjaRaw",
  "DiperbaruiPada",
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
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("GOOGLE_SHEET_ID belum diatur di environment variables.");
  return id;
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function toNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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

async function ensurePenilaianTab(sheets) {
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
    range: quotedRange("A1:J1"),
    valueInputOption: "RAW",
    requestBody: { values: [HEADER] },
  });

  return sheetId;
}

async function readAllRows(sheets) {
  await ensurePenilaianTab(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange("A2:J"),
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      periode: toText(row[0]),
      kandidatId: toText(row[1]),
      nama: toText(row[2]),
      subdit: toText(row[3]),
      kerapianBerpakaian: toNumber(row[4]),
      kepatuhanJamKerja: toNumber(row[5]),
      nilaiIntegritas: toNumber(row[6]),
      nilaiKehadiran: toNumber(row[7]),
      nilaiKinerjaRaw: toNumber(row[8]),
      diperbaruiPada: toText(row[9]),
    }));
}

async function writeAllRows(sheets, rows) {
  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange("A2:J"),
  });

  if (rows.length === 0) return;

  const values = rows.map((r) => [
    r.periode,
    r.kandidatId,
    r.nama,
    r.subdit,
    r.kerapianBerpakaian,
    r.kepatuhanJamKerja,
    r.nilaiIntegritas,
    r.nilaiKehadiran,
    r.nilaiKinerjaRaw,
    r.diperbaruiPada,
  ]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(`A2:J${values.length + 1}`),
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

/** Input penilaian (belum dihitung) yang sudah tersimpan untuk satu periode, per kandidatId. */
export async function getPenilaianByPeriode(periode) {
  const sheets = getSheetsClient();
  const all = await readAllRows(sheets);
  const target = toText(periode);
  const map = {};
  for (const r of all.filter((r) => r.periode === target)) {
    map[r.kandidatId] = r;
  }
  return map;
}

/**
 * Menyimpan (mengganti penuh) baris penilaian SATU periode. `rows` adalah
 * array { kandidatId, nama, subdit, kerapianBerpakaian, kepatuhanJamKerja,
 * nilaiIntegritas, nilaiKehadiran, nilaiKinerjaRaw } — baris periode lain
 * tidak tersentuh.
 */
export async function savePenilaianForPeriode(periode, rows = []) {
  const target = toText(periode);
  if (!target) {
    const err = new Error("Periode wajib diisi.");
    err.code = "INVALID";
    throw err;
  }

  const sheets = getSheetsClient();
  const all = await readAllRows(sheets);
  const now = new Date().toISOString();
  const sisa = all.filter((r) => r.periode !== target);

  const baru = (rows || [])
    .filter((r) => toText(r.kandidatId))
    .map((r) => ({
      periode: target,
      kandidatId: toText(r.kandidatId),
      nama: toText(r.nama),
      subdit: toText(r.subdit),
      kerapianBerpakaian: toNumber(r.kerapianBerpakaian),
      kepatuhanJamKerja: toNumber(r.kepatuhanJamKerja),
      nilaiIntegritas: toNumber(r.nilaiIntegritas),
      nilaiKehadiran: toNumber(r.nilaiKehadiran),
      nilaiKinerjaRaw: toNumber(r.nilaiKinerjaRaw),
      diperbaruiPada: now,
    }));

  await writeAllRows(sheets, [...sisa, ...baru]);
  return { periode: target, jumlahBaris: baru.length };
}

// Perhitungan skor (bobot, rumus, dan catatan beda dari Excel asal) ada di
// lib/penilaianTeladanSkor.js — diimpor & diekspor ulang di atas supaya
// Route Handler (app/api/penilaian-teladan/route.js) cukup impor dari sini.
