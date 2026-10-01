import styles from "./page.module.css";

// Komponen presentasi murni — tidak lagi menyimpan data statis sendiri.
// Datanya (per periode) diambil pemanggilnya lewat lib/timelineKinerja.js
// (Home, Server Component) atau lewat /api/timeline (halaman Timeline
// Kinerja Triwulanan, Client Component), lalu dioper sebagai prop `items`.
// Baris dengan "no" yang SAMA & berurutan digabung jadi satu Kegiatan
// dengan beberapa Pihak/Waktu (rowSpan) — lihat groupByNo di bawah.

function groupByNo(items) {
  const groups = [];
  let current = null;
  items.forEach((item) => {
    if (current && current.no === item.no) {
      current.rows.push(item);
      if (item.urgent) current.urgent = true;
    } else {
      current = { no: item.no, kegiatan: item.kegiatan, urgent: !!item.urgent, rows: [item] };
      groups.push(current);
    }
  });
  return groups;
}

export default function ReminderDeadlineDashboard({ title = "Reminder Deadline Evaluasi Kinerja", items = [] }) {
  const groups = groupByNo(items);
  const urgentGroup = groups.find((g) => g.urgent);
  const urgentRow = urgentGroup ? urgentGroup.rows.find((r) => r.urgent) || urgentGroup.rows[0] : null;

  return (
    <div className={`${styles.panel} ${styles.panelReminder}`}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" style={{ verticalAlign: "-3px", marginRight: 6 }}>
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.86 1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L14.7 3.86a2 2 0 00-3.4 0z" />
          </svg>
          {title}
        </span>
      </div>

      {urgentGroup && urgentRow && (
        <div className={styles.urgentBox}>
          <span className={styles.urgentTag}>URGENT!</span>
          <div className={styles.urgentBody}>
            <div className={styles.urgentKegiatan}>{urgentGroup.kegiatan}</div>
            <div className={styles.urgentMeta}>
              {urgentRow.pihak} &middot; {urgentRow.waktu}
            </div>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className={styles.reminderEmpty}>Belum ada data timeline untuk periode ini.</div>
      ) : (
        <div className={styles.reminderTableWrap}>
          <table className={styles.reminderTable}>
            <thead>
              <tr>
                <th>No</th>
                <th>Kegiatan</th>
                <th>Pihak</th>
                <th>Waktu Pelaksanaan</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) =>
                group.rows.map((r, i) => (
                  <tr key={`${group.no}-${i}`} className={group.urgent ? styles.reminderRowUrgent : undefined}>
                    {i === 0 && (
                      <>
                        <td rowSpan={group.rows.length} className={styles.reminderNo}>
                          {group.no}
                        </td>
                        <td rowSpan={group.rows.length} className={styles.reminderKegiatan}>
                          {group.kegiatan}
                        </td>
                      </>
                    )}
                    <td>{r.pihak}</td>
                    <td className={styles.reminderWaktu}>{r.waktu}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
