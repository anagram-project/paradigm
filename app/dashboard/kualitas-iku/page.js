import { requireMenuAccess } from "@/lib/requireMenuAccess";
import KualitasIkuClient from "./KualitasIkuClient";

export default async function KualitasIKUPage() {
  await requireMenuAccess("/dashboard/kualitas-iku");

  return <KualitasIkuClient />;
}
