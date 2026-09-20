import TeladanCarousel from "./TeladanCarousel";
import styles from "./page.module.css";

// Periode pemilihan yang sedang ditunggu — ganti nilainya tiap ganti triwulan,
// atau nanti dihubungkan ke data asli (misal dari Google Sheets) kalau sudah ada.
const PERIODE_BERIKUTNYA = "Triwulan III 2026";

export default function PegawaiTeladanPage() {
  return (
    <div className={styles.wrap}>
      <TeladanCarousel />

      <div className={styles.noticeBox}>
        <p>Mohon Bersabar,</p>
        <p>Tunggu Periode Pemilihan</p>
        <p>Pegawai Teladan {PERIODE_BERIKUTNYA}</p>
      </div>
    </div>
  );
}
