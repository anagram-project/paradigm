import { requireMenuAccess } from "@/lib/requireMenuAccess";
import UpdateTimelineKinerjaClient from "./UpdateTimelineKinerjaClient";

export default async function UpdateTimelineKinerjaPage() {
  // Setelah perubahan di lib/roles.js (ADMIN_ONLY_PATHS), path ini hanya
  // lolos untuk role Admin KKPA — LO Subdit & Biasa dilempar balik ke Home.
  await requireMenuAccess("/dashboard/update-timeline-kinerja");
  return <UpdateTimelineKinerjaClient />;
}
