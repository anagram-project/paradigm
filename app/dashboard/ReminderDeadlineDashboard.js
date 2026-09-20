import styles from "./page.module.css";

// Data statis (belum bersumber dari spreadsheet) sesuai jadwal yang
// diberikan — silakan minta disesuaikan lagi kalau ada perubahan tanggal
// atau tahapan.
const ITEMS = [
  {
    no: 1,
    kegiatan: "Pengusulan Evaluator",
    rows: [{ pihak: "Seluruh pegawai", waktu: "1 s.d 7 Juli 2026" }],
  },
  {
    no: 2,
    kegiatan: "Penetapan Evaluator",
    rows: [{ pihak: "Pejabat Penilai Kinerja", waktu: "1 s.d 10 Juli 2026" }],
  },
  {
    no: 3,
    kegiatan: "Penilaian Perilaku Kerja",
    rows: [{ pihak: "Evaluator", waktu: "1 s.d 17 Juli 2026" }],
  },
  {
    no: 4,
    kegiatan:
      "Pengajuan dan Penetapan Keberatan atas Nilai Perilaku Kerja (NPK) serta Penilaian Ulang atas Perilaku Kerja",
    rows: [
      {
        pihak: "Evaluee, Evaluator, Pejabat Penilai Kinerja, Atasan Pejabat Penilai Kinerja",
        waktu: "18 s.d 24 Juli 2026",
      },
    ],
  },
  {
    no: 5,
    kegiatan: "Rekam Realisasi IKI Pegawai",
    rows: [{ pihak: "Seluruh pegawai", waktu: "Paling lambat 31 Juli 2026" }],
  },
  {
    no: 6,
    kegiatan: "Validasi Realisasi IKI Pegawai",
    rows: [{ pihak: "Pejabat Penilai Kinerja", waktu: "1 s.d 10 Agustus 2026" }],
  },
  {
    no: 7,
    kegiatan: "Sidang Tim Penilai Kinerja (TPK)",
    rows: [
      { pihak: "UPK-Two", waktu: "Paling lambat 18 Agustus 2026" },
      { pihak: "UPK-One", waktu: "Paling lambat 24 Agustus 2026" },
      { pihak: "Pusat", waktu: "Paling lambat 31 Agustus 2026" },
    ],
  },
  {
    no: 8,
    kegiatan: "Penetapan SKEP NKP Triwulan II",
    rows: [
      { pihak: "Pimpinan UPK-Two", waktu: "Paling lambat 20 Agustus 2026" },
      { pihak: "Pimpinan UPK-One", waktu: "Paling lambat 26 Agustus 2026" },
      { pihak: "Sekretaris Jenderal a.n Menkeu", waktu: "Paling lambat 10 September 2026" },
    ],
  },
  {
    no: 9,
    kegiatan: "Penetapan DEK dan HEK Triwulan I",
    rows: [{ pihak: "Pegawai dan Pejabat Penilai Kinerja", waktu: "Paling lambat 10 September 2026" }],
  },
  {
    no: 10,
    kegiatan: "Penetapan DEK dan HEK Triwulan II",
    rows: [{ pihak: "Pegawai dan Pejabat Penilai Kinerja", waktu: "Dimulai 11 September 2026" }],
    urgent: true,
  },
];

export default function ReminderDeadlineDashboard({ title = "Reminder Deadline Evaluasi Kinerja" }) {
  const urgentItem = ITEMS.find((item) => item.urgent);

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

      {urgentItem && (
        <div className={styles.urgentBox}>
          <span className={styles.urgentTag}>URGENT!</span>
          <div className={styles.urgentBody}>
            <div className={styles.urgentKegiatan}>{urgentItem.kegiatan}</div>
            <div className={styles.urgentMeta}>
              {urgentItem.rows[0].pihak} &middot; {urgentItem.rows[0].waktu}
            </div>
          </div>
        </div>
      )}

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
            {ITEMS.map((item) =>
              item.rows.map((r, i) => (
                <tr key={`${item.no}-${i}`} className={item.urgent ? styles.reminderRowUrgent : undefined}>
                  {i === 0 && (
                    <>
                      <td rowSpan={item.rows.length} className={styles.reminderNo}>
                        {item.no}
                      </td>
                      <td rowSpan={item.rows.length} className={styles.reminderKegiatan}>
                        {item.kegiatan}
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
    </div>
  );
}
