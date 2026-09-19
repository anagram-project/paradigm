import styles from "./Placeholder.module.css";

export default function Placeholder({ title, description }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cobalt)" strokeWidth="2">
          <path d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <div className={styles.title}>{title}</div>
      <p className={styles.text}>
        {description || "Halaman ini masih dalam tahap pengembangan. Tambahkan fitur di sini secara bertahap."}
      </p>
    </div>
  );
}
