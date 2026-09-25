/**
 * scripts/tarik-iku.mjs
 *
 * Script LOKAL (dijalankan di komputer Anda sendiri, BUKAN bagian dari
 * aplikasi PARADIGM yang di-deploy ke Vercel) untuk menarik data daftar IKU
 * per pegawai dari API internal Satu Kemenkeu, memakai Bearer token yang
 * Anda ambil manual dari sesi login Anda sendiri (lewat DevTools browser).
 *
 * Script ini TIDAK menyimpan/mengingat token Anda di mana pun, dan hasil
 * tariknya tidak pernah otomatis ikut ter-commit ke git (lihat .gitignore).
 *
 * *** WAJIB DIISI DULU SEBELUM DIJALANKAN ***
 * Isi BEARER_TOKEN dan API_URL di bawah setelah Anda cek tab Network di
 * DevTools browser. Tanpa ini, script belum tahu endpoint yang benar dan
 * tidak akan berfungsi — ini kerangka/template, bukan yang sudah jadi utuh,
 * karena saya tidak tahu endpoint/struktur data Satu Kemenkeu yang
 * sebenarnya.
 *
 * Cara mendapatkan API_URL & BEARER_TOKEN:
 *   1. Login ke Satu Kemenkeu di browser seperti biasa.
 *   2. Buka halaman daftar IKU/IPR pegawai.
 *   3. Buka DevTools (tombol F12) > tab "Network" > filter "Fetch/XHR".
 *   4. Refresh halamannya, lalu cari request yang RESPONSNYA berupa JSON
 *      berisi daftar IKU (bukan file .html/.js/.css biasa).
 *   5. Klik request itu > tab "Headers":
 *        - Salin "Request URL" lengkap -> jadi nilai API_URL di bawah.
 *        - Cari header "Authorization: Bearer xxxxx" -> salin bagian
 *          setelah "Bearer " -> jadi nilai BEARER_TOKEN di bawah.
 *   6. Kalau method-nya bukan GET (misal POST dengan body tertentu),
 *      isi juga METHOD dan BODY di bawah.
 *   7. Jalankan dari folder project:   node scripts/tarik-iku.mjs
 *   8. Hasilnya tersimpan di scripts/output/iku-raw.json, dan otomatis
 *      dicoba diubah ke scripts/output/iku.csv kalau strukturnya cocok.
 *
 * Token biasanya kadaluwarsa dalam beberapa jam — kalau script gagal dengan
 * status 401, ambil ulang token terbaru dari DevTools dan isi lagi.
 */

// ==================== ISI BAGIAN INI ====================

const BEARER_TOKEN = "TEMPEL_BEARER_TOKEN_DI_SINI";

const API_URL = "https://satu.kemenkeu.go.id/GANTI/DENGAN/ENDPOINT/ASLI";

// "GET" untuk request tanpa body, atau "POST" kalau butuh body JSON.
const METHOD = "GET";
const BODY = null; // contoh kalau POST: { bulan: 9, tahun: 2026 }

// ==========================================================

import fs from "fs";
import path from "path";

async function main() {
  if (BEARER_TOKEN.includes("TEMPEL_") || API_URL.includes("GANTI/DENGAN")) {
    console.error(
      "\nBelum diisi: isi dulu BEARER_TOKEN dan API_URL di bagian atas file ini.\n" +
        "Lihat komentar 'Cara mendapatkan API_URL & BEARER_TOKEN' di atas.\n"
    );
    process.exit(1);
  }

  console.log("Menarik data dari:", API_URL);

  let res;
  try {
    res = await fetch(API_URL, {
      method: METHOD,
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Accept: "application/json",
        ...(BODY ? { "Content-Type": "application/json" } : {}),
      },
      body: BODY ? JSON.stringify(BODY) : undefined,
    });
  } catch (err) {
    console.error("Gagal terhubung ke API_URL. Cek koneksi/URL-nya. Detail:", err.message);
    process.exit(1);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error(`Gagal mengambil data. Status: ${res.status} ${res.statusText}`);
    if (res.status === 401 || res.status === 403) {
      console.error("Kemungkinan Bearer token sudah kadaluwarsa — ambil token baru dari DevTools.");
    }
    console.error("Isi respons (potongan awal):", text.slice(0, 500));
    process.exit(1);
  }

  const data = await res.json();

  const outDir = path.join(process.cwd(), "scripts", "output");
  fs.mkdirSync(outDir, { recursive: true });

  const rawPath = path.join(outDir, "iku-raw.json");
  fs.writeFileSync(rawPath, JSON.stringify(data, null, 2), "utf8");
  console.log("Data mentah (JSON) tersimpan di:", rawPath);

  // Percobaan otomatis mengubah ke CSV kalau bentuknya array of objects,
  // atau ada di dalam properti umum seperti data.data / data.result /
  // data.items. Kalau tidak cocok, buka iku-raw.json secara manual dan
  // kirim contohnya supaya script ini bisa disesuaikan.
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data?.items)
          ? data.items
          : null;

  if (!rows) {
    console.log(
      "\nStruktur respons tidak berupa array yang dikenali otomatis.\n" +
        "Buka scripts/output/iku-raw.json untuk lihat bentuk aslinya, lalu kirim\n" +
        "contohnya supaya script ini bisa disesuaikan mengambil array yang benar."
    );
    return;
  }

  if (rows.length === 0) {
    console.log("Respons berupa array tapi kosong (0 baris data).");
    return;
  }

  const columns = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );

  const escapeCsv = (val) => {
    if (val === undefined || val === null) return "";
    const s = typeof val === "object" ? JSON.stringify(val) : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csvLines = [
    columns.join(","),
    ...rows.map((row) => columns.map((col) => escapeCsv(row[col])).join(",")),
  ];

  const csvPath = path.join(outDir, "iku.csv");
  fs.writeFileSync(csvPath, csvLines.join("\n"), "utf8");

  console.log(`\nBerhasil: ${rows.length} baris disimpan ke ${csvPath}`);
  console.log("Kolom yang terdeteksi:", columns.join(", "));
  console.log(
    "\nSilakan cek scripts/output/iku.csv — kalau kolomnya sudah sesuai (NIP, Nama, nama IKU, " +
      "target, dll), kirim contoh isinya ke saya supaya saya bisa bangun fitur import resminya " +
      "di PARADIGM (skema Google Sheets + auto-isi form Buat IPR)."
  );
}

main().catch((err) => {
  console.error("Terjadi error tak terduga:", err);
  process.exit(1);
});
