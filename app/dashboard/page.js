import { getSessionUser } from "@/lib/auth";
import Carousel from "./Carousel";
import styles from "./page.module.css";

// Data contoh — nanti diganti dengan data asli dari Google Sheets.
const STAT_CARDS = [
  { id: "ipr", value: "12", label: "IPR Aktif" },
  { id: "koreksi", value: "3", label: "Koreksi Nilai Pending" },
  { id: "iku", value: "87%", label: "Rata-rata Kualitas IKU" },
  { id: "teladan", value: "Ahmad F.", label: "Pegawai Teladan Triwulan Ini", small: true },
];

const TIMELINE_ITEMS = [
  {
    id: "q1",
    label: "Q1 2026 — Penetapan IKU",
    meta: "Selesai pada 28 Maret 2026",
    status: "Selesai",
    color: "var(--cobalt)",
  },
  {
    id: "q2",
    label: "Q2 2026 — Evaluasi Capaian Triwulan I",
    meta: "Berlangsung, target 15 Juli 2026",
    status: "Berjalan",
    color: "var(--azure)",
  },
  {
    id: "q3",
    label: "Q3 2026 — Pemilihan Pegawai Teladan",
    meta: "Dijadwalkan Oktober 2026",
    status: "Tertunda",
    color: "#c7d2da",
  },
];

const NOTIFICATIONS = [
  { id: 1, time: "10:10", text: <>Koreksi nilai IKU diajukan oleh <b>Johan</b></> },
  { id: 2, time: "08:40", text: <>IPR baru menunggu persetujuan dari <b>Amalia</b></> },
  { id: 3, time: "07:10", text: "Timeline Triwulan II telah diperbarui" },
  { id: 4, time: "01:15", text: "Penilaian kualitas IKU seksi Anda selesai" },
];

// Server Component: dijalankan di server tiap request, jadi bisa membaca
// cookie sesi (getSessionUser) untuk menyapa nama pegawai yang sedang login
// (bukan lagi teks statis "Syakti"). Bagian carousel yang butuh state
// interaktif dipisah ke komponen client Carousel.js.
export default async function DashboardHomePage() {
  const session = await getSessionUser();
  const namaDepan = session?.nama ? session.nama.trim().split(/\s+/)[0] : "Pengguna";

  return (
    <>
      <div className={styles.welcomeBanner}>
        <div>
          <div className={styles.welcomeTitle}>Selamat datang, {namaDepan}!</div>
          <div className={styles.welcomeSubtitle}>
            Pantau dan koordinasikan kewajiban kinerja pegawai Direktorat Pelaksanaan Anggaran di satu tempat.
          </div>
        </div>
        <div className={styles.welcomeIcon}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A3D1FB" strokeWidth="2">
            <path d="M4 19V10M10 19V4M16 19v-7M22 19H2" />
          </svg>
        </div>
      </div>

      <Carousel />

      <div className={styles.statGrid}>
        {STAT_CARDS.map((card) => (
          <div key={card.id} className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
                <path d="M8 2h6l4 4v14a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2z" />
                <path d="M9 12h6M9 16h6" />
              </svg>
            </div>
            <div className={`${styles.statValue} ${card.small ? styles.statValueSmall : ""}`}>{card.value}</div>
            <div className={styles.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.panelsRow}>
        <div className={`${styles.panel} ${styles.panelTimeline}`}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Timeline Kinerja Triwulanan</span>
            <a href="/dashboard/timeline" className={styles.panelLink}>
              Lihat Semua →
            </a>
          </div>
          <div className={styles.timelineList}>
            {TIMELINE_ITEMS.map((item) => (
              <div key={item.id} className={styles.timelineItem}>
                <div className={styles.timelineDot} style={{ background: item.color }} />
                <div className={styles.timelineBody}>
                  <div className={styles.timelineLabel}>{item.label}</div>
                  <div className={styles.timelineMeta}>{item.meta}</div>
                </div>
                <span
                  className={styles.statusBadge}
                  style={{ color: item.color === "#c7d2da" ? "var(--muted)" : item.color, background: "var(--badge-bg)" }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${styles.panel} ${styles.panelNotif}`}>
          <div className={styles.panelTitle} style={{ marginBottom: 18 }}>
            Notifikasi Terbaru
          </div>
          <div className={styles.notifList}>
            {NOTIFICATIONS.map((notif, i) => (
              <div key={notif.id} className={styles.notifItem}>
                <span className={styles.notifTime}>{notif.time}</span>
                <div
                  className={styles.notifBody}
                  style={{ borderLeft: `2px solid ${i % 2 === 0 ? "var(--cobalt)" : "var(--sky)"}` }}
                >
                  <div className={styles.notifText}>{notif.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
