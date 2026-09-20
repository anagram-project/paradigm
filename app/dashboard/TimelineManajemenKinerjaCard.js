import styles from "./page.module.css";

// Data statis (belum bersumber dari spreadsheet), sesuai jadwal yang
// diberikan untuk Triwulan II Tahun 2026 — silakan minta disesuaikan lagi
// kalau ada perubahan tahapan/tanggal atau kalau ini perlu beda per periode.
const ITEMS = [
  {
    no: 1,
    kegiatan:
      "Menyampaikan:\na. LCK IIAA UPK-One DJPb Triwulan II Tahun 2026\nb. Bahan DKRO UPK-One DJPb Triwulan II Tahun 2026\nc. Data dukung capaian IKU UPK-One DJPb Triwulan II Tahun 2026",
    keterangan: "Nota dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Subdit KKPA (Masukan dari Seluruh Subdit)",
    batasWaktu: "*10 Juli 2026",
  },
  {
    no: 2,
    kegiatan: "Menyampaikan sumber data capaian IKU/IKI mandatory Triwulan II Tahun 2026 kepada Unit penerima IKU/IKI mandatory",
    keterangan: "Nota Dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Subdit Penyedia Capaian IKU",
    batasWaktu: "*10 Juli 2026",
  },
  {
    no: 3,
    kegiatan: "Merekam Realisasi IKU dan menghitung Nilai Kinerja Organisasi Triwulan II 2026",
    keterangan: "Aplikasi Satu Kemenkeu dan Aplikasi INTENSE DJPb",
    pihak: "Subdit KKPA (Masukan dari Seluruh Subdit)",
    batasWaktu: "*10 Juli 2026",
  },
  {
    no: 4,
    kegiatan:
      "Menyusun dan menyampaikan Laporan Kinerja UPK-Two Triwulan II Tahun 2026:\na. NKO\nb. LCK dalam format IIAA\nc. Raw Data capaian IKU\nd. Laporan Progres Inisiatif Strategis\ne. Data dukung capaian IKU",
    keterangan: "Nota dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Seluruh Subdit (Lead: Subdit KKPA)",
    batasWaktu: "*10 Juli 2026",
  },
  {
    no: 5,
    kegiatan:
      "Menyusun dan menyampaikan Laporan Kinerja UPK-Three Subdirektorat Triwulan II Tahun 2026:\na. NKO\nb. LCK dalam format IIAA\nc. Raw Data capaian IKU\nd. Laporan Progres Inisiatif Strategis\ne. Data dukung capaian IKU",
    keterangan: "Nota dinas melalui Aplikasi Satu Kemenkeu",
    pihak: "Seluruh Kepala Subdirektorat",
    batasWaktu: "*10 Juli 2026",
  },
  {
    no: 6,
    kegiatan: "Reviu Kualitas Komitmen Kinerja",
    keterangan: "Aplikasi Satu Kemenkeu",
    pihak: "Subdit KKPA",
    batasWaktu: "27 Juli 2026",
  },
  {
    no: 7,
    kegiatan: "Unggah dokumen kinerja pribadi Triwulan II 2026",
    keterangan: "Aplikasi INTENSE DJPb",
    pihak: "Seluruh pegawai",
    batasWaktu: "*15 Juli 2026",
  },
  {
    no: 8,
    kegiatan: "Menyampaikan Laporan Langkah-langkah Peningkatan Kualitas Manajemen Kinerja Periode Triwulan II Tahun 2026",
    keterangan: "Nota Dinas melalui Aplikasi Satu Kemenkeu dan Aplikasi INTENSE DJPb",
    pihak: "Subdit KKPA (Masukan dari Seluruh Subdit)",
    batasWaktu: "*24 Juli 2026",
    urgent: true,
  },
];

export default function TimelineManajemenKinerjaCard() {
  const urgentItem = ITEMS.find((item) => item.urgent);

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
            {ITEMS.map((item) => (
              <tr key={item.no} className={item.urgent ? styles.reminderRowUrgent : undefined}>
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
    </div>
  );
}
