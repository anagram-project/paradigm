import styles from "./page.module.css";

// Komponen presentasi murni (lihat catatan yang sama di
// ReminderDeadlineDashboard.js) — datanya dioper lewat prop `items`.

export default function TimelineManajemenKinerjaCard({ items = [] }) {
  const urgentItem = items.find((item) => item.urgent);

  return (
    <div className={`${styles.panel} ${styles.panelReminder}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2" style={{ verticalAlign: "-3px", marginRight: 6 }}>
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4" />
          </svg>
          Timeline Manajemen Kinerja
        </span>
      </div>

      {urgentItem && (
        <div className={styles.urgentBox}>
          <span className={styles.urgentTag}>URGENT!</span>
          <div className={styles.urgentBody}>
            <div className={styles.urgentKegiatan}>{urgentItem.kegiatan.split("\n")[0]}</div>
            <div className={styles.urgentMeta}>
              {urgentItem.pihak} &middot; {urgentItem.batasWaktu}
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className={styles.reminderEmpty}>Belum ada data timeline untuk periode ini.</div>
      ) : (
        <div className={styles.reminderTableWrap}>
          <table className={styles.reminderTable}>
            <thead>
              <tr>
                <th>No</th>
                <th>Kegiatan</th>
                <th>Keterangan</th>
                <th>Pihak</th>
                <th>Batas Waktu</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={`${item.no}-${i}`} className={item.urgent ? styles.reminderRowUrgent : undefined}>
                  <td className={styles.reminderNo}>{item.no}</td>
                  <td className={styles.reminderKegiatan} style={{ whiteSpace: "pre-line" }}>
                    {item.kegiatan}
                  </td>
                  <td>{item.keterangan}</td>
                  <td>{item.pihak}</td>
                  <td className={styles.reminderWaktu}>{item.batasWaktu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
