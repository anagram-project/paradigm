import { google } from "googleapis";
import { parse } from "csv-parse/sync";

// --- Data referensi IKI (hasil tarik dari menu Monitoring IPR di Satu
// Kemenkeu) ---
// Disimpan sebagai SATU TAB baru ("ReferensiIKI") di SPREADSHEET UTAMA
// PARADIGM (GOOGLE_SHEET_ID yang sama dengan Sheet1 data login pegawai) —
// bukan spreadsheet terpisah, sesuai permintaan. Satu baris = satu baris
// asli dari file export Satu Kemenkeu (satu IKI pada satu SKP pegawai).
//
// Skema kolom (55, identik dengan struktur file export "Realisasi & Perilaku"
// Satu Kemenkeu — GANTI dari skema lama 20-kolom yang tidak punya kolom
// Realisasi/NPK/BerAKHLAK; skema lama sudah tidak dipakai lagi sesuai
// keputusan pengguna "Gantikan data referensi lama"):
//   A Nama | B NIP | C Jabatan | D Pangkat/Golongan | E Unit Organisasi
//   F Kode SKP | G Jenis SKP | H Periode SKP Mulai | I Periode SKP Selesai
//   J Kategori IKI | K Nomor IKI | L Nama IKI | M Periode Pelaporan
//   N Target TW I | O Target TW II | P Target TW III | Q Target TW IV
//   R Target Semester I | S Target Tahunan
//   T Realisasi TW I (bln Mar) | U Realisasi TW II (bln Jun)
//   V Realisasi TW III (bln Sep) | W Realisasi TW IV (bln Des)
//   X NPK TW I | Y-AE 7 aspek BerAKHLAK TW I (Berorientasi Pelayanan,
//     Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif)
//   AF NPK TW II | AG-AM 7 aspek BerAKHLAK TW II
//   AN NPK TW III | AO-AU 7 aspek BerAKHLAK TW III
//   AV NPK TW IV | AW-BC 7 aspek BerAKHLAK TW IV
//
// Nilai NPK & 7 aspek BerAKHLAK berlaku PER PEGAWAI PER TRIWULAN (bukan per
// IKI) — di file export nilainya berulang identik pada setiap baris IKI
// milik pegawai yang sama pada triwulan yang sama (sudah diverifikasi).
//
// Data ini di-import ULANG (timpa penuh) tiap kali Admin KKPA / LO Subdit
// mengunggah file CSV baru lewat menu Pengaturan (mis. tiap ada pull data
// terbaru dari Satu Kemenkeu) — lihat importReferensiCsv().

const TAB_NAME = process.env.IPR_REFERENSI_SHEET_TAB || "ReferensiIKI";

const BERAKHLAK_LABELS = [
  "Berorientasi Pelayanan",
  "Akuntabel",
  "Kompeten",
  "Harmonis",
  "Loyal",
  "Adaptif",
  "Kolaboratif",
];
const BERAKHLAK_KEYS = [
  "berorientasiPelayanan",
  "akuntabel",
  "kompeten",
  "harmonis",
  "loyal",
  "adaptif",
  "kolaboratif",
];

// Header kolom sheet (persis nama kolom file export) & key camelCase paralel
// yang dipakai di objek JS — dua array ini HARUS selalu sepanjang & seurutan
// yang sama (index ke-i header <-> index ke-i key).
const HEADER = [
  "Nama",
  "NIP",
  "Jabatan",
  "Pangkat/Golongan",
  "Unit Organisasi",
  "Kode SKP",
  "Jenis SKP",
  "Periode SKP Mulai",
  "Periode SKP Selesai",
  "Kategori IKI",
  "Nomor IKI",
  "Nama IKI",
  "Periode Pelaporan",
  "Target TW I",
  "Target TW II",
  "Target TW III",
  "Target TW IV",
  "Target Semester I",
  "Target Tahunan",
  "Realisasi TW I (bln Mar)",
  "Realisasi TW II (bln Jun)",
  "Realisasi TW III (bln Sep)",
  "Realisasi TW IV (bln Des)",
  "NPK TW I",
  ...BERAKHLAK_LABELS.map((l) => `${l} TW I`),
  "NPK TW II",
  ...BERAKHLAK_LABELS.map((l) => `${l} TW II`),
  "NPK TW III",
  ...BERAKHLAK_LABELS.map((l) => `${l} TW III`),
  "NPK TW IV",
  ...BERAKHLAK_LABELS.map((l) => `${l} TW IV`),
];

const KEYS = [
  "nama",
  "nip",
  "jabatan",
  "pangkatGolongan",
  "unitOrganisasi",
  "kodeSkp",
  "jenisSkp",
  "periodeMulai",
  "periodeSelesai",
  "kategoriIki",
  "nomorIki",
  "namaIki",
  "periodePelaporan",
  "targetTwI",
  "targetTwII",
  "targetTwIII",
  "targetTwIV",
  "targetSemesterI",
  "targetTahunan",
  "realisasiTwI",
  "realisasiTwII",
  "realisasiTwIII",
  "realisasiTwIV",
  "npkTwI",
  ...BERAKHLAK_KEYS.map((k) => `${k}TwI`),
  "npkTwII",
  ...BERAKHLAK_KEYS.map((k) => `${k}TwII`),
  "npkTwIII",
  ...BERAKHLAK_KEYS.map((k) => `${k}TwIII`),
  "npkTwIV",
  ...BERAKHLAK_KEYS.map((k) => `${k}TwIV`),
];

const ROMAN = ["I", "II", "III", "IV"];

// Daftar tetap opsi periode IPR: Triwulan I 2026 s.d. Triwulan IV 2027,
// sesuai permintaan (bukan bergeser otomatis mengikuti tanggal berjalan
// seperti menu Koreksi Nilai, karena periode IPR perlu direncanakan jauh
// ke depan / tetap terlihat meski periode berjalan sudah lewat).
export function getIprPeriodeOptions() {
  const options = [];
  for (const year of [2026, 2027]) {
    for (const roman of ROMAN) {
      options.push(`Triwulan ${roman} ${year}`);
    }
  }
  return options;
}

/** "Triwulan II 2026" -> { quarter: 2, year: 2026, roman: "II" } */
export function parsePeriodeLabel(label) {
  const m = String(label || "").match(/Triwulan\s+(I{1,3}V?|IV)\s+(\d{4})/i);
  if (!m) return null;
  const roman = m[1].toUpperCase();
  const quarter = ROMAN.indexOf(roman) + 1;
  if (quarter <= 0) return null;
  return { quarter, year: Number(m[2]), roman };
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
  return new google.auth.JWT({ email, key, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getWriteAuth() });
}

function getSpreadsheetId() {
  // Spreadsheet UTAMA PARADIGM (sama dengan Sheet1 data login), BUKAN
  // spreadsheet simulasi Kualitas IKU (GOOGLE_SIMULASI_SHEET_ID).
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

function quotedRange(tabName, a1) {
  return `'${tabName.replace(/'/g, "''")}'!${a1}`;
}

function toText(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

// NIP di file export bisa berformat "'197512101996021003" (format teks Excel
// lama, diawali tanda kutip satu) ATAU "="197512101996021003"" (format file
// export terbaru, dibungkus =" ... ") — keduanya dibuang di sini supaya bisa
// dicocokkan apa adanya dengan NIP di Sheet1 (data login).
function cleanNip(value) {
  const s = toText(value);
  const m = s.match(/^="(.*)"$/);
  if (m) return m[1].trim();
  return s.replace(/^'+/, "");
}

async function getSheetsMeta(sheets) {
  const res = await sheets.spreadsheets.get({
    spreadsheetId: getSpreadsheetId(),
    fields: "sheets.properties(sheetId,title)",
  });
  return (res.data.sheets || []).map((s) => s.properties);
}

async function ensureTab(sheets, metas) {
  const existing = metas.find((m) => m.title === TAB_NAME);
  if (existing) return existing.sheetId;
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: getSpreadsheetId(),
    requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
  });
  return res.data.replies[0].addSheet.properties.sheetId;
}

/**
 * Membersihkan & mem-parse teks mentah file export "Monitoring IPR — Realisasi
 * & Perilaku" dari Satu Kemenkeu (CSV dipisah titik-koma, boleh diawali baris
 * "sep=;"). Mengembalikan array baris siap tulis ke sheet (urutan kolom =
 * HEADER, lihat definisi di atas).
 */
export function parseReferensiCsv(csvText) {
  const cleaned = String(csvText || "").replace(/^﻿/, ""); // buang BOM kalau ada
  const withoutSepLine = cleaned.replace(/^sep=;\r?\n/i, "");

  const records = parse(withoutSepLine, {
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  const rows = records.map((r) =>
    HEADER.map((colName) => {
      const raw = r[colName];
      return colName === "NIP" ? cleanNip(raw) : toText(raw);
    })
  );

  // Buang baris yang identik persis berulang (ditemukan pada file export
  // sebelumnya) — bagian dari "merapihkan data" sebelum ditulis ke sheet
  // referensi. File export terbaru sejauh ini tidak punya duplikat, tapi
  // pengecekan ini tetap dipertahankan untuk jaga-jaga.
  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const key = row.join("\u0001");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }
  return deduped;
}

const NAVY = { red: 0.086, green: 0.176, blue: 0.337 };
const WHITE = { red: 1, green: 1, blue: 1 };

/**
 * Menulis ULANG SELURUH isi tab "ReferensiIKI" (header + seluruh baris data
 * yang diberikan) — dipakai bersama oleh importReferensiCsv (timpa penuh
 * dari file baru) dan mergeReferensiTriwulan (baris hasil gabungan data lama
 * + data baru yang sudah disiapkan pemanggilnya), supaya logika tulis-sheet
 * & rapikan tampilannya tidak dobel.
 */
async function writeReferensiFullSheet(sheets, metas, rows) {
  const sheetId = await ensureTab(sheets, metas);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: getSpreadsheetId(),
    range: `'${TAB_NAME.replace(/'/g, "''")}'`,
  });

  const allRows = [HEADER, ...rows];
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(TAB_NAME, `A1:${colLetter(HEADER.length)}${allRows.length}`),
    valueInputOption: "RAW", // teks apa adanya, jangan diinterpretasi ulang (mis. "3,1", NIP)
    requestBody: { values: allRows },
  });

  // Rapikan tampilan: header tebal navy, beku baris 1, lebar kolom otomatis.
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: HEADER.length },
              cell: {
                userEnteredFormat: {
                  backgroundColor: NAVY,
                  textFormat: { bold: true, foregroundColor: WHITE },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: HEADER.length },
            },
          },
        ],
      },
    });
  } catch (formatError) {
    console.error("Gagal merapikan format sheet ReferensiIKI:", formatError);
  }
}

/** Urutan rapi: Nama pegawai lalu Kategori IKI — dipakai importReferensiCsv & mergeReferensiTriwulan. */
function sortReferensiRows(rows) {
  rows.sort((a, b) => {
    const byNama = (a[0] || "").localeCompare(b[0] || "", "id");
    if (byNama !== 0) return byNama;
    return (a[9] || "").localeCompare(b[9] || "", "id"); // Kategori IKI
  });
  return rows;
}

/**
 * Mengimpor (menimpa penuh) data referensi IKI dari teks CSV Satu Kemenkeu
 * ke tab "ReferensiIKI". Dipanggil dari menu Pengaturan (Admin KKPA / LO
 * Subdit) tiap kali ada pull data terbaru yang SUDAH lengkap (berisi seluruh
 * pegawai & seluruh triwulan yang relevan) — kalau file yang diunggah hanya
 * berisi pembaruan SATU triwulan saja (mis. realisasi TW III yang baru
 * ditutup) sementara data TW lain di sheet harus tetap dipertahankan, pakai
 * mergeReferensiTriwulan() di bawah, bukan fungsi ini.
 */
export async function importReferensiCsv(csvText) {
  const rows = parseReferensiCsv(csvText);
  if (rows.length === 0) {
    const err = new Error("File CSV tidak berisi data yang bisa dibaca.");
    err.code = "EMPTY";
    throw err;
  }

  // Urutkan rapi berdasarkan Nama pegawai lalu Kategori IKI supaya enak
  // dibaca langsung dari Google Sheets ("merapihkan" data).
  sortReferensiRows(rows);

  const sheets = getSheetsClient();
  const metas = await getSheetsMeta(sheets);
  await writeReferensiFullSheet(sheets, metas, rows);

  return { totalBaris: rows.length, totalPegawai: new Set(rows.map((r) => r[1])).size };
}

// Kolom (indeks 0-based, sesuai urutan HEADER/KEYS) yang dipakai sebagai
// "kunci" pencocokan satu baris referensi: satu baris = satu Kode SKP/Nomor
// IKI/Kategori IKI milik satu NIP. Dipakai mergeReferensiTriwulan untuk
// menentukan baris existing mana yang harus diperbarui vs baris baru yang
// harus ditambahkan.
const KEY_COL_NIP = KEYS.indexOf("nip"); // 1
const KEY_COL_KODE_SKP = KEYS.indexOf("kodeSkp"); // 5
const KEY_COL_NOMOR_IKI = KEYS.indexOf("nomorIki"); // 10
const KEY_COL_KATEGORI_IKI = KEYS.indexOf("kategoriIki"); // 9

function referensiRowKey(arr) {
  return [cleanNip(arr[KEY_COL_NIP]), toText(arr[KEY_COL_KODE_SKP]), toText(arr[KEY_COL_NOMOR_IKI]), toText(arr[KEY_COL_KATEGORI_IKI])].join(
    "\u0001"
  );
}

/** Daftar KEYS kolom triwulan tertentu yang boleh disentuh mergeReferensiTriwulan: Realisasi, NPK, & 7 aspek BerAKHLAK triwulan itu. */
function kolomTriwulanUntukMerge(quarter) {
  const roman = ROMAN[quarter - 1];
  return [REALISASI_KEY_BY_QUARTER[quarter - 1], NPK_KEY_BY_QUARTER[quarter - 1], ...BERAKHLAK_KEYS.map((k) => `${k}Tw${roman}`)];
}

/**
 * Memperbarui (GABUNG, bukan menimpa) data referensi IKI untuk SATU triwulan
 * tertentu dari file CSV baru (format sama persis dengan importReferensiCsv)
 * ke tab "ReferensiIKI" — dipakai saat admin hanya ingin mengisi/memperbarui
 * kolom realisasi & nilai perilaku triwulan yang baru saja ditutup (mis. TW
 * III ditutup akhir September), TANPA menghapus atau mengubah baris/kolom
 * triwulan lain yang sudah ada di sheet.
 *
 * Pencocokan baris existing vs baris di file baru memakai kunci NIP + Kode
 * SKP + Nomor IKI + Kategori IKI (lihat referensiRowKey):
 * - Baris yang sudah ada & cocok: HANYA kolom triwulan yang dipilih (Realisasi
 *   TW<n>, NPK TW<n>, dan 7 aspek BerAKHLAK TW<n>) yang ditimpa dengan nilai
 *   dari file baru (kalau nilainya tidak kosong) — kolom lain, termasuk data
 *   triwulan lain pada baris yang sama, dibiarkan PERSIS seperti sebelumnya.
 * - Baris di file baru yang kombinasi kuncinya belum pernah ada di sheet:
 *   ditambahkan sebagai baris baru (SKP/IKI baru untuk pegawai tsb), data
 *   lain yang sudah ada di sheet tidak tersentuh sama sekali.
 */
export async function mergeReferensiTriwulan(csvText, quarter) {
  const q = Number(quarter);
  if (![1, 2, 3, 4].includes(q)) {
    const err = new Error("Triwulan tidak valid (harus 1, 2, 3, atau 4).");
    err.code = "INVALID";
    throw err;
  }

  const incomingRows = parseReferensiCsv(csvText);
  if (incomingRows.length === 0) {
    const err = new Error("File CSV tidak berisi data yang bisa dibaca.");
    err.code = "EMPTY";
    throw err;
  }

  const mergeFieldKeys = kolomTriwulanUntukMerge(q);
  const mergeColIdx = mergeFieldKeys.map((k) => KEYS.indexOf(k)).filter((i) => i >= 0);

  const sheets = getSheetsClient();
  const metas = await getSheetsMeta(sheets);
  await ensureTab(sheets, metas);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(TAB_NAME, `A2:${colLetter(HEADER.length)}`),
  });

  // Sheets API memotong sel kosong di akhir baris — panjangkan lagi ke
  // HEADER.length supaya indeks kolom selalu konsisten dipakai di bawah.
  const existingRows = (res.data.values || []).map((row) => {
    const padded = row.slice(0, HEADER.length);
    while (padded.length < HEADER.length) padded.push("");
    return padded;
  });

  const existingIndexByKey = new Map();
  existingRows.forEach((arr, idx) => {
    const key = referensiRowKey(arr);
    if (!existingIndexByKey.has(key)) existingIndexByKey.set(key, idx);
  });

  let totalBarisDiperbarui = 0;
  let totalBarisBaru = 0;
  const barisBaru = [];

  for (const incoming of incomingRows) {
    const key = referensiRowKey(incoming);
    const existingIdx = existingIndexByKey.get(key);
    if (existingIdx === undefined) {
      barisBaru.push(incoming);
      totalBarisBaru++;
      continue;
    }
    const target = existingRows[existingIdx];
    let berubah = false;
    for (const colIdx of mergeColIdx) {
      const nilaiBaru = incoming[colIdx];
      if (nilaiBaru !== "" && nilaiBaru !== target[colIdx]) {
        target[colIdx] = nilaiBaru;
        berubah = true;
      }
    }
    if (berubah) totalBarisDiperbarui++;
  }

  const semuaBaris = sortReferensiRows([...existingRows, ...barisBaru]);
  await writeReferensiFullSheet(sheets, metas, semuaBaris);

  return {
    totalBarisDiperbarui,
    totalBarisBaru,
    totalBarisTotal: semuaBaris.length,
    totalPegawai: new Set(semuaBaris.map((r) => r[KEY_COL_NIP])).size,
    kolomDiperbarui: mergeColIdx.map((i) => HEADER[i]),
  };
}

/** Membaca seluruh baris referensi milik satu NIP (mentah, semua SKP/IKI). */
export async function getReferensiRowsForNip(nip) {
  const sheets = getSheetsClient();
  const metas = await getSheetsMeta(sheets);
  const exists = metas.some((m) => m.title === TAB_NAME);
  if (!exists) return [];

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(TAB_NAME, `A2:${colLetter(HEADER.length)}`),
  });
  const rows = res.data.values || [];
  const target = cleanNip(nip);

  return rows
    .filter((row) => cleanNip(row[1]) === target)
    .map((row) => {
      const obj = {};
      KEYS.forEach((key, i) => {
        obj[key] = key === "nip" ? cleanNip(row[i]) : toText(row[i]);
      });
      return obj;
    });
}

/**
 * Memecah teks "Unit Organisasi" (dipisah koma, dari level terkecil ke
 * terbesar) menjadi Unit Eselon IV/III/II/I, sesuai posisi field pada
 * dokumen Format IPR. Diambil dari KANAN supaya tetap benar walau
 * jenjangnya cuma 2-3 level (mis. pejabat Eselon II/III yang SKP-nya
 * langsung di level itu, tanpa Seksi/Subdit di bawahnya).
 */
export function splitUnitOrganisasi(unitOrganisasi) {
  const parts = String(unitOrganisasi || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const n = parts.length;
  return {
    es1: n >= 1 ? parts[n - 1] : "",
    es2: n >= 2 ? parts[n - 2] : "",
    es3: n >= 3 ? parts[n - 3] : "",
    es4: n >= 4 ? parts[n - 4] : "",
  };
}

const TARGET_KEY_BY_QUARTER = ["targetTwI", "targetTwII", "targetTwIII", "targetTwIV"];
const REALISASI_KEY_BY_QUARTER = ["realisasiTwI", "realisasiTwII", "realisasiTwIII", "realisasiTwIV"];

/**
 * Menyusun daftar IKI (Hasil Kerja) yang relevan untuk satu pegawai pada
 * satu periode Triwulan, dari seluruh baris referensinya. Tiap baris hasil
 * juga menyertakan nilai `realisasi` (kalau tersedia) untuk auto-isi field
 * "Capaian" di menu Buat IPR (tetap bisa diedit manual oleh pegawai).
 *
 * Aturan (didokumentasikan karena tidak eksplisit di file export):
 * - IKI dengan Periode Pelaporan "Triwulan": ikut disertakan kalau kolom
 *   Target TW <sesuai triwulan yang dipilih> terisi (kolom itu otomatis
 *   kosong pada baris SKP yang tidak berlaku di triwulan tsb, jadi ini
 *   sekaligus menyaring SKP mana yang aktif tanpa perlu membandingkan
 *   tanggal Periode SKP Mulai/Selesai secara terpisah). Realisasi diambil
 *   dari kolom Realisasi TW <sesuai triwulan> kalau ada.
 * - IKI dengan Periode Pelaporan "Semester": disertakan untuk Triwulan I
 *   & II saja (pakai Target Semester I) — file export belum menyediakan
 *   kolom Target/Realisasi Semester II, jadi realisasi dikosongkan (diisi
 *   manual).
 * - IKI dengan Periode Pelaporan "Tahunan": disertakan di SEMUA triwulan
 *   (pakai Target Tahunan) sebagai pengingat berjalan sepanjang tahun —
 *   tidak ada kolom Realisasi Tahunan, realisasi dikosongkan.
 * Baris dengan Nama IKI kosong dilewati.
 */
export function getHasilKerjaForPeriode(referensiRows, periodeLabel) {
  const parsed = parsePeriodeLabel(periodeLabel);
  if (!parsed) return [];
  const { quarter, year } = parsed;

  const twKey = TARGET_KEY_BY_QUARTER[quarter - 1];
  const realisasiKey = REALISASI_KEY_BY_QUARTER[quarter - 1];

  const result = [];
  for (const r of referensiRows) {
    if (!r.namaIki) continue;
    // Cocokkan tahun dari Kode SKP / Periode SKP Mulai-Selesai kalau ada.
    const rowYear = (r.periodeMulai || r.periodeSelesai || "").slice(0, 4);
    if (rowYear && Number(rowYear) !== year) continue;

    let target = null;
    let realisasi = "";
    if (r.periodePelaporan === "Triwulan") {
      if (r[twKey]) {
        target = r[twKey];
        realisasi = r[realisasiKey] || "";
      }
    } else if (r.periodePelaporan === "Semester") {
      if ((quarter === 1 || quarter === 2) && r.targetSemesterI) target = r.targetSemesterI;
    } else if (r.periodePelaporan === "Tahunan") {
      if (r.targetTahunan) target = r.targetTahunan;
    } else {
      // Periode Pelaporan tidak dikenali/kosong — tetap sertakan kalau ada
      // target triwulan yang cocok, supaya data tidak hilang begitu saja.
      if (r[twKey]) {
        target = r[twKey];
        realisasi = r[realisasiKey] || "";
      }
    }

    if (target == null) continue;
    result.push({
      kategoriIki: r.kategoriIki,
      nomorIki: r.nomorIki,
      namaIki: r.namaIki,
      periodePelaporan: r.periodePelaporan,
      target,
      realisasi,
      kodeSkp: r.kodeSkp,
    });
  }

  // IKI Utama dulu, baru IKI Tambahan; dalam kategori yang sama urut Nomor IKI.
  result.sort((a, b) => {
    if (a.kategoriIki !== b.kategoriIki) return a.kategoriIki === "IKI Utama" ? -1 : 1;
    return (a.nomorIki || "").localeCompare(b.nomorIki || "", "id", { numeric: true });
  });

  // Buang duplikat (Nama IKI + Kategori sama persis) kalau ada baris ganda.
  const seen = new Set();
  return result.filter((r) => {
    const key = `${r.kategoriIki}|${r.namaIki}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const NPK_KEY_BY_QUARTER = ["npkTwI", "npkTwII", "npkTwIII", "npkTwIV"];

/**
 * Mengambil nilai NPK & 7 aspek BerAKHLAK satu pegawai untuk satu periode
 * Triwulan, dipakai untuk auto-isi bagian PERILAKU KERJA di menu Buat IPR.
 * Nilai ini berlaku per-pegawai-per-triwulan (bukan per IKI), jadi cukup
 * diambil dari baris referensi pertama yang punya nilai NPK triwulan itu.
 * Mengembalikan null kalau tidak ada data untuk triwulan tsb.
 */
export function getPerilakuKerjaForPeriode(referensiRows, periodeLabel) {
  const parsed = parsePeriodeLabel(periodeLabel);
  if (!parsed) return null;
  const { quarter, year } = parsed;

  const npkKey = NPK_KEY_BY_QUARTER[quarter - 1];
  const aspekTwKeys = BERAKHLAK_KEYS.map((k) => `${k}Tw${ROMAN[quarter - 1]}`);

  const row = referensiRows.find((r) => {
    const rowYear = (r.periodeMulai || r.periodeSelesai || "").slice(0, 4);
    if (rowYear && Number(rowYear) !== year) return false;
    return Boolean(r[npkKey]);
  });
  if (!row) return null;

  const aspects = {};
  BERAKHLAK_KEYS.forEach((key, i) => {
    aspects[key] = row[aspekTwKeys[i]] || "";
  });

  return { npk: row[npkKey] || "", aspects };
}

export { TAB_NAME as REFERENSI_IKI_TAB_NAME };
export { BERAKHLAK_LABELS, BERAKHLAK_KEYS };
