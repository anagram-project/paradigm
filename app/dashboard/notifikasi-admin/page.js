import { requireMenuAccess } from "@/lib/requireMenuAccess";
import NotifikasiAdminClient from "./NotifikasiAdminClient";

export default async function NotifikasiAdminPage() {
  // Setelah perubahan di lib/roles.js (ADMIN_ONLY_PATHS), path ini hanya
  // lolos untuk role Admin KKPA — LO Subdit & Biasa dilempar balik ke Home.
  await requireMenuAccess("/dashboard/notifikasi-admin");
  return <NotifikasiAdminClient />;
}
