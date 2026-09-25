import { requireMenuAccess } from "@/lib/requireMenuAccess";
import Placeholder from "../_components/Placeholder";

export default async function KualitasIKUPage() {
  await requireMenuAccess("/dashboard/kualitas-iku");

  return (
    <Placeholder
      title="Design Kualitas IKU"
      description="Penyusunan dan penilaian kualitas Indikator Kinerja Utama akan ditambahkan di sini."
    />
  );
}
