import { google } from "googleapis";

// --- Timeline Kinerja Triwulanan ---
// Ditampilkan di menu "Timeline Kinerja Triwulanan" (semua role) dan
// dikelola Admin KKPA lewat "Menu Khusus Admin Aplikasi" > "Update Timeline
// Kinerja". Disimpan di spreadsheet utama PARADIGM (GOOGLE_SHEET_ID), tab
// "TimelineKinerja" (dibuat otomatis kalau belum ada).
//
// Satu BARIS = satu baris kegiatan pada satu PERIODE & satu JENIS timeline
// ("evaluasi" = Timeline Evaluasi Kinerja, "manajemen" = Timeline Manajemen
// Kinerja). Kolom Pihak/Waktu dipakai khusus jenis "evaluasi"; Keterangan/
// BatasWaktu dipakai khusus jenis "manajemen" (field yang tak relevan
// dibiarkan kosong).
//
// Kolom tab "TimelineKinerja":
//   A Periode | B Jenis | C No | D Kegiatan | E Pihak | F Waktu
//   G Keterangan | H BatasWaktu | I Urgent (TRUE/FALSE) | J DiperbaruiPada
//
// Baris dengan "No" yang SAMA pada jenis "evaluasi" sengaja boleh berulang
// (mis. beberapa Pihak/Waktu untuk satu Kegiatan seperti "Sidang TPK") —
// ditampilkan digabung satu baris Kegiatan dengan rowSpan di UI publik.

const SHEET_TAB = "TimelineKinerja";
const HEADER = [
  "Periode",
  "Jenis",
  "No",
  "Kegiatan",
  "Pihak",
  "Waktu",
  "Keterangan",
  "BatasWaktu",
  "Urgent",
  "DiperbaruiPada",
];

export const JENIS_TIMELINE = {
  EVALUASI: "evaluasi",
  MANAJEMEN: "manajemen",
};

// Periode yang kontennya SUDAH ADA sebelum fitur Update Timeline Kinerja ini
// dibuat (sebelumnya hardcode di kode) — dipakai sebagai fallback supaya
// konten yang sudah ada tidak hilang/kosong sebelum Admin KKPA sempat
// membuka & menyimpan ulang lewat halaman admin yang baru. Begitu Admin
// KKPA menyimpan periode ini lewat halaman admin, data asli di spreadsheet
// akan dipakai dan fallback ini otomatis tidak terpakai lagi.
export const PERIODE_SEED_DEFAULT = "Triwulan II 2026";

const SEED_EVALUASI_KINERJA = [
  { no: "1", kegiatan: "Pengusulan Evaluator", pihak: "Seluruh pegawai", waktu: "1 s.d 7 Juli 2026", urgent: false },
  {
    no: "2",
    kegiatan: "Penetapan Evaluator",
    pihak: "Pejabat Penilai Kinerja",
    waktu: "1 s.d 10 Juli 2026",
    urgent: false,
  },
  {
    no: "3",
    kegiatan: "Penilaian Perilaku Kerja",
    pihak: "Evaluator",
    waktu: "1 s.d 17 Juli 2026",
    urgent: false,
  },
  {
    no: "4",
    kegiatan:
      "Pengajuan dan Penetapan Keberatan atas Nilai Perilaku Kerja (NPK) serta Penilaian Ulang atas Perilaku Kerja",
    pihak: "Evaluee, Evaluator, Pejabat Penilai Kinerja, Atasan Pejabat Penilai Kinerja",
    waktu: "18 s.d 24 Juli 2026",
    urgent: false,
  },
  {
    no: "5",
    kegiatan: "Rekam Realisasi IKI Pegawai",
    pihak: "Seluruh pegawai",
    waktu: "Paling lambat 31 Juli 2026",
    urgent: false,
  },
  {
    no: "6",
    kegiatan: "Validasi Realisasi IKI Pegawai",
    pihak: "Pejabat Penilai Kinerja",
    waktu: "1 s.d 10 Agustus 2026",
    urgent: false,
  },
  {
    no: "7",
    kegiatan: "Sidang Tim Penilai Kinerja (TPK)",
    pihak: "UPK-Two",
    waktu: "Paling lambat 18 Agustus 2026",
    urgent: false,
  },
  {
    no: "7",
    kegiatan: "Sidang Tim Penilai Kinerja (TPK)",
    pihak: "UPK-One",
    waktu: "Paling lambat 24 Agustus 2026",
    urgent: false,
  },
  {
    no: "7",
    kegiatan: "Sidang Tim Penilai Kinerja (TPK)",
    pihak: "Pusat",
    waktu: "Paling lambat 31 Agustus 2026",
    urgent: false,
  },
  {
    no: "8",
    kegiatan: "Penetapan SKEP NKP Triwulan II",
    pihak: "Pimpinan UPK-Two",
    waktu: "Paling lambat 20 Agustus 2026",
    urgent: false,
  },
  {
    no: "8",
    kegiatan: "Penetapan SKEP NKP Triwulan II",
    pihak: "Pimpinan UPK-One",
    waktu: "Paling lambat 26 Agustus 2026",
    urgent: false,
  },
  {
    no: "8",
    kegiatan: "Penetapan SKEP NKP Triwulan II",
    pihak: "Sekretaris Jenderal a.n Menkeu",
    waktu: "Paling lambat 10 September 2026",
    urgent: false,
  },
  {
    no: "9",
    kegiatan: "Penetapan DEK dan HEK Triwulan I",
    pihak: "Pegawai dan Pejabat Penilai Kinerja",
    waktu: "Paling lambat 10 September 2026",
    urgent: false,
  },
  {
    no: "10",
    kegiatan: "Penetapan DEK dan HEK Triwulan II",
    pihak: "Pegawai dan Pejabat Penilai Kinerja",
    waktu: "Dimulai 11 September 2026",
    urgent: true,
  },
];

const SEED_MANAJEMEN_KINERJA = [
  {
    no: "1",
    kegiatan:
      "Menyampaikan:\na. LCK IIAA UPK-One DJPb Triwulan II Tahun 2026\nb. Bahan DKRO UPK-One DJPb Triwulan II Tahun 2026\nc. Data dukung capaian IKU UPK-One DJPb Triwulan II Tahun 2026",
    keterangan: "Nota dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Subdit KKPA (Masukan dari Seluruh Subdit)",
    batasWaktu: "*10 Juli 2026",
    urgent: false,
  },
  {
    no: "2",
    kegiatan:
      "Menyampaikan sumber data capaian IKU/IKI mandatory Triwulan II Tahun 2026 kepada Unit penerima IKU/IKI mandatory",
    keterangan: "Nota Dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Subdit Penyedia Capaian IKU",
    batasWaktu: "*10 Juli 2026",
    urgent: false,
  },
  {
    no: "3",
    kegiatan: "Merekam Realisasi IKU dan menghitung Nilai Kinerja Organisasi Triwulan II 2026",
    keterangan: "Aplikasi Satu Kemenkeu dan Aplikasi INTENSE DJPb",
    pihak: "Subdit KKPA (Masukan dari Seluruh Subdit)",
    batasWaktu: "*10 Juli 2026",
    urgent: false,
  },
  {
    no: "4",
    kegiatan:
      "Menyusun dan menyampaikan Laporan Kinerja UPK-Two Triwulan II Tahun 2026:\na. NKO\nb. LCK dalam format IIAA\nc. Raw Data capaian IKU\nd. Laporan Progres Inisiatif Strategis\ne. Data dukung capaian IKU",
    keterangan: "Nota dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Seluruh Subdit (Lead: Subdit KKPA)",
    batasWaktu: "*10 Juli 2026",
    urgent: false,
  },
  {
    no: "5",
    kegiatan:
      "Menyusun dan menyampaikan Laporan Kinerja UPK-Three Subdirektorat Triwulan II Tahun 2026:\na. NKO\nb. LCK dalam format IIAA\nc. Raw Data capaian IKU\nd. Laporan Progres Inisiatif Strategis\ne. Data dukung capaian IKU",
    keterangan: "Nota dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Seluruh Kepala Subdirektorat",
    batasWaktu: "*10 Juli 2026",
    urgent: false,
  },
  {
    no: "6",
    kegiatan: "Reviu Kualitas Komitmen Kinerja",
    keterangan: "Aplikasi Satu Kemenkeu",
    pihak: "Subdit KKPA",
    batasWaktu: "27 Juli 2026",
    urgent: false,
  },
  {
    no: "7",
    kegiatan: "Unggah dokumen kinerja pribadi Triwulan II 2026",
    keterangan: "Aplikasi INTENSE DJPb",
    pihak: "Seluruh pegawai",
    batasWaktu: "*15 Juli 2026",
    urgent: false,
  },
  {
    no: "8",
    kegiatan: "Menyampaikan Laporan Langkah-langkah Peningkatan Kualitas Manajemen Kinerja Periode Triwulan II Tahun 2026",
    keterangan: "Nota Dinas melalui Aplikasi Satu Kemenkeu dan Aplikasi INTENSE DJPb",
    pihak: "Subdit KKPA (Masukan dari Seluruh Subdit)",
    batasWaktu: "*24 Juli 2026",
    urgent: true,
  },
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

async function ensureTimelineTab(sheets) {
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
  await ensureTimelineTab(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange("A2:J"),
  });
  const rows = res.data.values || [];
  return rows
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      periode: toText(row[0]),
      jenis: toText(row[1]),
      no: toText(row[2]),
      kegiatan: toText(row[3]),
      pihak: toText(row[4]),
      waktu: toText(row[5]),
      keterangan: toText(row[6]),
      batasWaktu: toText(row[7]),
      urgent: toText(row[8]).toUpperCase() === "TRUE",
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
    r.jenis,
    r.no,
    r.kegiatan,
    r.pihak,
    r.waktu,
    r.keterangan,
    r.batasWaktu,
    r.urgent ? "TRUE" : "FALSE",
    r.diperbaruiPada,
  ]);
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: quotedRange(`A2:J${values.length + 1}`),
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

function sortByNo(rows) {
  return [...rows].sort((a, b) => (Number(a.no) || 0) - (Number(b.no) || 0));
}

function stripRowMeta(rows) {
  return rows.map(({ periode, jenis, diperbaruiPada, ...rest }) => rest);
}

/**
 * Data timeline (Evaluasi Kinerja & Manajemen Kinerja) untuk SATU periode —
 * dipakai baik halaman publik "Timeline Kinerja Triwulanan" maupun halaman
 * admin "Update Timeline Kinerja". Kalau periode ini belum pernah disimpan
 * sama sekali DAN periode-nya adalah PERIODE_SEED_DEFAULT, kembalikan data
 * bawaan (seed) supaya konten yang sebelumnya hardcode tidak hilang.
 */
export async function getTimelineByPeriode(periode) {
  const sheets = getSheetsClient();
  const all = await readAllRows(sheets);
  const target = toText(periode);

  const adaDataPeriodeIni = all.some((r) => r.periode === target);

  if (!adaDataPeriodeIni && target === PERIODE_SEED_DEFAULT) {
    return {
      periode: target,
      evaluasiKinerja: SEED_EVALUASI_KINERJA.map((r) => ({ ...r })),
      manajemenKinerja: SEED_MANAJEMEN_KINERJA.map((r) => ({ ...r })),
      sumber: "bawaan",
    };
  }

  const evaluasiKinerja = stripRowMeta(sortByNo(all.filter((r) => r.periode === target && r.jenis === JENIS_TIMELINE.EVALUASI)));
  const manajemenKinerja = stripRowMeta(
    sortByNo(all.filter((r) => r.periode === target && r.jenis === JENIS_TIMELINE.MANAJEMEN))
  );

  return { periode: target, evaluasiKinerja, manajemenKinerja, sumber: "spreadsheet" };
}

/** Daftar periode yang sudah punya data tersimpan di spreadsheet (bukan bawaan/fallback). */
export async function listPeriodeTersedia() {
  const sheets = getSheetsClient();
  const all = await readAllRows(sheets);
  return [...new Set(all.map((r) => r.periode))];
}

/**
 * Menyimpan (mengganti penuh) data timeline SATU periode. Seluruh baris
 * lama periode ini (kedua jenis) dihapus lalu diganti baris baru — periode
 * lain tidak tersentuh.
 */
export async function saveTimelineForPeriode(periode, { evaluasiKinerja = [], manajemenKinerja = [] } = {}) {
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

  const baruEvaluasi = evaluasiKinerja
    .filter((r) => toText(r.kegiatan))
    .map((r, i) => ({
      periode: target,
      jenis: JENIS_TIMELINE.EVALUASI,
      no: toText(r.no) || String(i + 1),
      kegiatan: toText(r.kegiatan),
      pihak: toText(r.pihak),
      waktu: toText(r.waktu),
      keterangan: "",
      batasWaktu: "",
      urgent: !!r.urgent,
      diperbaruiPada: now,
    }));

  const baruManajemen = manajemenKinerja
    .filter((r) => toText(r.kegiatan))
    .map((r, i) => ({
      periode: target,
      jenis: JENIS_TIMELINE.MANAJEMEN,
      no: toText(r.no) || String(i + 1),
      kegiatan: toText(r.kegiatan),
      pihak: toText(r.pihak),
      waktu: "",
      keterangan: toText(r.keterangan),
      batasWaktu: toText(r.batasWaktu),
      urgent: !!r.urgent,
      diperbaruiPada: now,
    }));

  await writeAllRows(sheets, [...sisa, ...baruEvaluasi, ...baruManajemen]);

  return { periode: target, jumlahEvaluasi: baruEvaluasi.length, jumlahManajemen: baruManajemen.length };
}

/** Menghapus seluruh data timeline (kedua jenis) satu periode. */
export async function deleteTimelineForPeriode(periode) {
  const target = toText(periode);
  const sheets = getSheetsClient();
  const all = await readAllRows(sheets);
  const sisa = all.filter((r) => r.periode !== target);

  if (sisa.length === all.length) {
    const err = new Error("Tidak ada data tersimpan untuk periode tersebut.");
    err.code = "NOT_FOUND";
    throw err;
  }

  await writeAllRows(sheets, sisa);
  return { periode: target };
}
