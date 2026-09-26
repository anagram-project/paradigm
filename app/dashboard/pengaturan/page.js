import { requireMenuAccess } from "@/lib/requireMenuAccess";
import PengaturanClient from "./PengaturanClient";

export default async function PengaturanPage() {
  await requireMenuAccess("/dashboard/pengaturan");
  return <PengaturanClient />;
}
