import { getSessionUser } from "@/lib/auth";
import { generatePeriodeOptions, periodeDefault } from "@/lib/periodeKinerja";
import { getTimelineByPeriode } from "@/lib/timelineKinerja";
import Carousel from "./Carousel";
import MonitoringKoreksiDashboard from "./MonitoringKoreksiDashboard";
import ReminderDeadlineDashboard from "./ReminderDeadlineDashboard";
import styles from "./page.module.css";

// Server Component: dijalankan di server tiap request, jadi bisa membaca
// cookie sesi (getSessionUser) untuk menyapa nama pegawai yang sedang login
// (bukan lagi teks statis "Syakti"). Bagian carousel yang butuh state
// interaktif dipisah ke komponen client Carousel.js.
export default async function DashboardHomePage() {
  const session = await getSessionUser();
  const namaDepan = session?.nama ? session.nama.trim().split(/\s+/)[0] : "Pengguna";

  // Widget ini menampilkan Timeline Evaluasi Kinerja periode default (lihat
  // lib/periodeKinerja.js) — kalau Google Sheets sedang bermasalah, jangan
  // sampai seluruh Home ikut gagal, cukup tampilkan widget kosong.
  let evaluasiKinerja = [];
  try {
    const periode = periodeDefault(generatePeriodeOptions());
    const timeline = await getTimelineByPeriode(periode);
    evaluasiKinerja = timeline.evaluasiKinerja;
  } catch (error) {
    console.error("Gagal memuat Timeline Evaluasi Kinerja untuk Home:", error);
  }

  return (
    <>
      <div className={styles.topWelcomeBar}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A3D1FB" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M3 11l18-5v12L3 14v-3z" />
          <path d="M7 14v5a2 2 0 002 2h1" />
        </svg>
        <span className={styles.topWelcomeText}>Selamat datang, {namaDepan}!</span>
      </div>

      <Carousel />

      <div className={styles.dashboardsRow}>
        <MonitoringKoreksiDashboard />
        <ReminderDeadlineDashboard items={evaluasiKinerja} />
      </div>
    </>
  );
}
