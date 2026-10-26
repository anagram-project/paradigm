import { requireMenuAccess } from "@/lib/requireMenuAccess";
import PenilaianTeladanClient from "./PenilaianTeladanClient";

export default async function PenilaianPegawaiTeladanPage() {
  // Lewat ADMIN_ONLY_PATHS di lib/roles.js, path ini hanya lolos untuk role
  // Admin KKPA — LO Subdit & Biasa dilempar balik ke Home.
  await requireMenuAccess("/dashboard/penilaian-pegawai-teladan");
  return <PenilaianTeladanClient />;
}
