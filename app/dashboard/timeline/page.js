"use client";

import { useEffect, useMemo, useState } from "react";
import PeriodeSelector from "./PeriodeSelector";
import ReminderDeadlineDashboard from "../ReminderDeadlineDashboard";
import TimelineManajemenKinerjaCard from "../TimelineManajemenKinerjaCard";
import { generatePeriodeOptions, periodeDefault } from "@/lib/periodeKinerja";
import styles from "./page.module.css";

export default function TimelinePage() {
  const periodeOptions = useMemo(() => generatePeriodeOptions(), []);
  const [periode, setPeriode] = useState(() => periodeDefault(periodeOptions));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadTimeline() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/timeline?periode=${encodeURIComponent(periode)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Gagal memuat data timeline.");
          setData(null);
        } else {
          setData(json);
        }
      } catch {
        if (!cancelled) {
          setError("Tidak bisa terhubung ke server.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadTimeline();
    return () => {
      cancelled = true;
    };
  }, [periode]);

  return (
    <div className={styles.wrap}>
      <PeriodeSelector options={periodeOptions} value={periode} onChange={setPeriode} />

      {loading ? (
        <p className={styles.loadingText}>Memuat data timeline...</p>
      ) : error ? (
        <div className={styles.errorBox}>{error}</div>
      ) : (
        <div className={styles.timelineRow}>
          <ReminderDeadlineDashboard title="Timeline Evaluasi Kinerja" items={data?.evaluasiKinerja || []} />
          <TimelineManajemenKinerjaCard items={data?.manajemenKinerja || []} />
        </div>
      )}
    </div>
  );
}
