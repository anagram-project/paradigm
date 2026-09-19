# PARADIGM

**P**elaksanaan **A**nggaran Performance & **R**isk **A**ction **D**igitalized Management — aplikasi internal untuk mengoordinasikan kewajiban kinerja pegawai di Direktorat Pelaksanaan Anggaran, DJPb.

Dibangun dengan [Next.js](https://nextjs.org) (App Router) + JavaScript polos, tanpa dependensi UI framework tambahan — cocok sebagai sandbox belajar coding sekaligus fondasi aplikasi nyata.

## Menjalankan di komputer lokal

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — akan langsung diarahkan ke halaman Login, lalu ke `/dashboard` setelah menekan tombol **Masuk** (saat ini belum terhubung ke sistem autentikasi sungguhan).

## Struktur proyek

```
app/
  layout.js              # Layout akar aplikasi
  globals.css            # Variabel warna & reset gaya global
  page.js                # Halaman Login ("/")
  login.module.css
  dashboard/
    layout.js            # Shell dashboard: sidebar + header (dipakai semua halaman dashboard)
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
public/
  images/
    login-bg.png           # Background halaman Login
    pegawai-teladan.png    # Gambar slide carousel "Pegawai Teladan"
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

## Rencana pengembangan berikutnya

- Sambungkan tiap menu placeholder (`Buat IPR`, `Manajemen Koreksi Nilai`, dst.) ke fitur sungguhan.
- Hubungkan data ke Google Sheets sebagai sumber data ("database"), lewat Google Sheets API dengan service account.
- Tambahkan autentikasi (mis. Google OAuth) menggantikan form login statis saat ini.
- Deploy ke Vercel, terhubung ke repository GitHub agar setiap `git push` otomatis men-deploy versi terbaru.
