import PeriodeSelector from "./PeriodeSelector";
import ReminderDeadlineDashboard from "../ReminderDeadlineDashboard";
import TimelineManajemenKinerjaCard from "../TimelineManajemenKinerjaCard";
import styles from "./page.module.css";

export default function TimelinePage() {
  return (
    <div className={styles.wrap}>
      <PeriodeSelector />

      <div className={styles.timelineRow}>
        <ReminderDeadlineDashboard title="Timeline Evaluasi Kinerja" />
        <TimelineManajemenKinerjaCard />
      </div>
    </div>
  );
}
