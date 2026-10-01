export const metadata = {
  title: "Kebijakan Privasi - PARADIGM",
};

// Halaman statis (tanpa login) — dibutuhkan sebagai syarat Google OAuth
// Consent Screen (Branding > Application privacy policy link) agar status
// publikasi OAuth Client bisa diubah ke "In production", sehingga refresh
// token Google Drive tidak lagi kedaluwarsa otomatis tiap 7 hari.
export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "48px auto",
        padding: "0 20px 64px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#1e293b",
        lineHeight: 1.7,
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Kebijakan Privasi PARADIGM</h1>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 32 }}>Terakhir diperbarui: Oktober 2026</p>

      <p>
        PARADIGM adalah aplikasi internal untuk mendukung pengelolaan kinerja pegawai di
        lingkungan Direktorat Pelaksanaan Anggaran, Direktorat Jenderal Perbendaharaan,
        Kementerian Keuangan RI. Aplikasi ini bersifat privat/internal dan hanya digunakan
        oleh pegawai di lingkungan direktorat tersebut.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Data yang dikumpulkan</h2>
      <p>
        Aplikasi menyimpan data kepegawaian dasar (nama, NIP, jabatan, pangkat/golongan,
        unit kerja), data terkait penilaian kinerja (Indikator Kinerja Individu, Perilaku
        Kerja, Koreksi Nilai), serta dokumen pendukung (Naskah Dinas dalam format PDF) yang
        diunggah pegawai sebagai bukti dukung Koreksi Nilai.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Penyimpanan data</h2>
      <p>
        Data disimpan di Google Sheets dan Google Drive milik organisasi, dan hanya dapat
        diakses melalui aplikasi ini setelah pengguna login dengan akun yang terdaftar.
        Dokumen pendukung yang diunggah hanya dapat diakses lewat tautan yang tersimpan di
        sistem, digunakan semata-mata untuk keperluan verifikasi internal oleh LO Subdit
        dan Admin KKPA sesuai kewenangan masing-masing.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Akses Google Drive &amp; Google Sheets</h2>
      <p>
        Aplikasi ini terhubung ke Google Drive hanya untuk membuat dan mengelola folder
        serta file yang dibuat oleh aplikasi sendiri (scope <code>drive.file</code>), bukan
        untuk membaca atau menjelajahi file lain di akun Google Drive pengguna.
      </p>

      <h2 style={{ fontSize: 16, marginTop: 28 }}>Kontak</h2>
      <p>
        Pertanyaan terkait kebijakan privasi ini dapat disampaikan melalui pengelola
        aplikasi PARADIGM di lingkungan Direktorat Pelaksanaan Anggaran.
      </p>
    </main>
  );
}
