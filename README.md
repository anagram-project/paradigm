# PARADIGM

**P**elaksanaan **A**nggaran Performance & **R**isk **A**ction **D**igitalized Management — aplikasi internal untuk mengoordinasikan kewajiban kinerja pegawai di Direktorat Pelaksanaan Anggaran, DJPb.

Dibangun dengan [Next.js](https://nextjs.org) (App Router) + JavaScript polos, tanpa dependensi UI framework tambahan — cocok sebagai sandbox belajar coding sekaligus fondasi aplikasi nyata.

## Menjalankan di komputer lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan menampilkan halaman Login. Sejak fitur autentikasi ditambahkan, login butuh 4 environment variable (lihat bagian **Autentikasi & Database User** di bawah) — tanpa itu, `npm run dev` tetap jalan tapi mencoba login akan gagal dengan error server.

## Struktur proyek

```
app/
  layout.js              # Layout akar aplikasi
  globals.css            # Variabel warna & reset gaya global
  page.js                # Halaman Login ("/") — memanggil /api/auth/login
  login.module.css
  api/
    auth/
      login/route.js      # POST — verifikasi email+password ke Google Sheets, set cookie sesi
      logout/route.js     # POST — hapus cookie sesi
  dashboard/
    layout.js            # Shell dashboard: sidebar + header + tombol Keluar (logout)
    layout.module.css
    page.js               # Halaman Home ("/dashboard") — banner, carousel, statistik, timeline
    page.module.css
    buat-ipr/page.js
    koreksi-nilai/page.js
    kualitas-iku/page.js
    pegawai-teladan/page.js
    timeline/page.js
    pengaturan/page.js     # Semua masih berupa halaman placeholder
    _components/
      Placeholder.js       # Komponen placeholder yang dipakai halaman-halaman di atas
lib/
  googleSheets.js          # Baca data pegawai (NIP, Password, Role, dst.) dari Google Sheets
  auth.js                  # Verifikasi NIP+password + buat/verifikasi token sesi (JWT)
middleware.js               # Menjaga rute /dashboard/* — redirect ke "/" jika belum login
public/
  images/
    login-bg.png           # Background halaman Login
    pegawai-teladan.png    # Gambar slide carousel "Pegawai Teladan"
.env.local.example          # Contoh environment variable yang dibutuhkan (salin jadi .env.local)
```

## Palet warna

| Warna | Hex | Fungsi |
|---|---|---|
| Deep Navy Blue | `#062455` | Teks utama, border, siluet |
| Cobalt Blue | `#073F97` | Warna utama |
| Azure Blue | `#125DD8` | Aksen primer / status aktif |
| Brilliant Sky Blue | `#2D88F0` | Highlight & elemen interaktif |
| Ice Sky Blue | `#A3D1FB` | Highlight terang / background |

Didefinisikan sebagai CSS custom properties di `app/globals.css` (`--navy`, `--cobalt`, `--azure`, `--sky`, `--ice`, dst).

## Autentikasi & Database User (Google Sheets)

Login memakai skema **NIP + password**, mengikuti data pegawai yang sudah ada (mis. sheet "User Paradigm"). Daftar pegawai dibaca lewat *service account* Google Cloud (bukan akun pribadi Anda).

Alurnya: form Login (`app/page.js`) mengirim NIP+password ke `POST /api/auth/login` → route ini mengambil seluruh baris dari Sheets (`lib/googleSheets.js`), mencocokkan NIP, lalu membandingkan password yang diketik dengan nilai kolom **Password** di baris tersebut (`lib/auth.js`) → jika cocok, dibuatkan token sesi (JWT) berisi NIP/nama/role, disimpan sebagai cookie `httpOnly` selama 8 jam. `middleware.js` memeriksa cookie ini di setiap akses ke `/dashboard/*` dan mengarahkan kembali ke halaman Login jika tidak ada/tidak valid. Tombol **Keluar** di header dashboard memanggil `POST /api/auth/logout` yang menghapus cookie tersebut.

### Skema kolom Sheet yang dipakai

Sheet dibaca dari tab bernama **`Sheet1`** secara default (bisa diganti lewat env var `GOOGLE_SHEET_TAB` kalau tab Anda diberi nama lain), baris pertama = header, data mulai baris ke-2:

| Kolom | Isi |
|---|---|
| A | Nama Pegawai |
| B | **NIP** (dipakai untuk login, harus unik per pegawai) |
| C–J | Jabatan, Pangkat, Golongan, Unit Kerja, Es4, Es3, Es2, Es1 (data pendukung, belum dipakai di UI tapi sudah ikut terbaca untuk pengembangan menu berikutnya) |
| K | **Password** (dipakai untuk login apa adanya, lihat catatan keamanan di bawah) |
| L | Role (mis. `Biasa`, `AKP`, `AKO`, `Admin`) |

> Penting: format kolom **NIP** dan **Password** di Google Sheets sebagai **Plain text** (Format → Number → Plain text), bukan Number/Automatic. Kalau dibiarkan sebagai angka, NIP yang berawalan angka 0 bisa terpotong atau berubah ke notasi ilmiah, dan login akan gagal karena nilainya tidak cocok lagi.

### Tahap 1 — Buat Service Account di Google Cloud

1. Buka [Google Cloud Console](https://console.cloud.google.com/) → buat project baru (atau pakai yang sudah ada).
2. Aktifkan **Google Sheets API**: menu *APIs & Services* → *Library* → cari "Google Sheets API" → **Enable**.
3. Buat service account: *APIs & Services* → *Credentials* → **Create Credentials** → **Service account**. Beri nama bebas (mis. `paradigm-sheets-reader`), lanjut sampai selesai (role tidak wajib diisi).
4. Buka service account yang baru dibuat → tab **Keys** → **Add Key** → **Create new key** → pilih **JSON** → unduh filenya. File ini berisi `client_email` dan `private_key` yang dibutuhkan nanti — simpan baik-baik, jangan pernah di-commit ke GitHub.

### Tahap 2 — Bagikan spreadsheet ke Service Account

1. Buka spreadsheet data pegawai Anda (yang kolomnya sudah sesuai skema di atas).
2. **Bagikan (Share)** spreadsheet ini ke alamat email service account (`client_email` dari file JSON, formatnya seperti `nama@project-id.iam.gserviceaccount.com`), minimal akses **Viewer**. Tanpa langkah ini, aplikasi tidak akan bisa membaca datanya sama sekali.
3. Ambil **Spreadsheet ID** dari URL sheet tersebut — bagian di antara `/d/` dan `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`INI_SPREADSHEET_ID_NYA`**`/edit`
4. Kalau file Anda berupa file Excel (.xlsx) yang diunggah ke Drive dan dibuka lewat mode kompatibilitas Office (ada lencana kecil "XLSX" di sebelah judul), sebaiknya simpan ulang sebagai Google Sheets asli lewat **File → Simpan sebagai Google Sheets**, supaya akses lewat API lebih pasti berjalan normal.

### Tahap 3 — Isi environment variable

Salin `.env.local.example` menjadi `.env.local` (file ini sudah di-gitignore, tidak akan ter-commit), lalu isi nilainya:

| Variabel | Isi |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` dari file JSON service account |
| `GOOGLE_PRIVATE_KEY` | `private_key` dari file JSON service account (termasuk `\n` di dalamnya, dibiarkan sebagai teks) |
| `GOOGLE_SHEET_ID` | Spreadsheet ID dari Tahap 2 |
| `SESSION_SECRET` | String acak rahasia untuk menandatangani token sesi — bisa dibuat dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_SHEET_TAB` | Opsional — isi hanya kalau nama tab bukan `Sheet1` |

Jalankan `npm run dev`, lalu coba login dengan salah satu NIP dan password (isi kolom Password) yang ada di sheet.

### Tahap 4 — Tambahkan environment variable yang sama di Vercel

Agar login juga berfungsi di situs yang sudah live (`paradigm-kappa.vercel.app`), buka dashboard Vercel → project `paradigm` → **Settings** → **Environment Variables**, lalu tambahkan variabel yang sama seperti di `.env.local`. Setelah disimpan, deploy ulang (redeploy) proyeknya — atau cukup `git push` sekali lagi — agar Vercel memakai nilai barunya.

> Catatan keamanan: password di sini dibandingkan sebagai **teks biasa** langsung dari kolom Password di Sheet (tidak di-hash), mengikuti data pegawai yang sudah ada. Ini memadai untuk sandbox internal skala kecil (~20 pengguna) dengan akses spreadsheet yang dibatasi, tapi siapa pun yang punya akses baca ke spreadsheet ini otomatis bisa melihat semua password. Kalau ke depannya aplikasi ini dipakai lebih serius, pertimbangkan dua langkah peningkatan: (1) kembali memakai password ter-hash (bcrypt) seperti versi sebelumnya, atau (2) mengganti login dengan Google Sign-In (OAuth) sehingga tidak ada password yang perlu disimpan sama sekali.

## Rencana pengembangan berikutnya

- Sambungkan tiap menu placeholder (`Buat IPR`, `Manajemen Koreksi Nilai`, dst.) ke fitur sungguhan, termasuk baca/tulis data ke Google Sheets — data Jabatan/Pangkat/Golongan/Unit Kerja per pegawai sudah ikut terbaca dari sheet dan siap dipakai.
- Pertimbangkan mengganti password teks biasa dengan hash (bcrypt), atau migrasi penuh ke Google Sign-In (OAuth).
- Tambahkan halaman "Lupa Kata Sandi" atau alur reset password sederhana.
- Deploy ke Vercel, terhubung ke repository GitHub agar setiap `git push` otomatis men-deploy versi terbaru (sudah berjalan sejak deployment pertama).
