// Membaca file JSON key Service Account, lalu mencetak baris siap-tempel
// untuk .env.local — supaya tidak perlu copy-paste manual private_key
// (sumber paling umum error "DECODER routines::unsupported" / format PEM rusak).
//
// Cara pakai (dari folder utama proyek):
//   node scripts/read-service-account.js "C:\Users\NamaAnda\Downloads\nama-file-key.json"
//
// (Kalau path-nya mengandung spasi, wajib dibungkus tanda kutip seperti contoh di atas.)

const fs = require("fs");

const jsonPath = process.argv[2];

if (!jsonPath) {
  console.error('Pemakaian: node scripts/read-service-account.js "path\\ke\\file-key.json"');
  process.exit(1);
}

let data;
try {
  const raw = fs.readFileSync(jsonPath, "utf8");
  data = JSON.parse(raw);
} catch (error) {
  console.error(`Gagal membaca/parsing file "${jsonPath}": ${error.message}`);
  process.exit(1);
}

if (!data.client_email || !data.private_key) {
  console.error('File ini sepertinya bukan key Service Account yang benar (tidak ada "client_email" atau "private_key").');
  process.exit(1);
}

const base64Key = Buffer.from(data.private_key, "utf8").toString("base64");

console.log("\nSalin 2 baris berikut ke file .env.local Anda (timpa baris yang sudah ada):\n");
console.log(`GOOGLE_SERVICE_ACCOUNT_EMAIL=${data.client_email}`);
console.log(`GOOGLE_PRIVATE_KEY_BASE64=${base64Key}`);
console.log("");
