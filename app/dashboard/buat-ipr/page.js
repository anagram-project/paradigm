import { requireMenuAccess } from "@/lib/requireMenuAccess";
import BuatIprClient from "./BuatIprClient";

export default async function BuatIPRPage() {
  await requireMenuAccess("/dashboard/buat-ipr");
  return <BuatIprClient />;
}
