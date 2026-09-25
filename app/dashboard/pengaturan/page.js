import { requireMenuAccess } from "@/lib/requireMenuAccess";
import Placeholder from "../_components/Placeholder";

export default async function PengaturanPage() {
  await requireMenuAccess("/dashboard/pengaturan");

  return (
    <Placeholder
      title="Pengaturan"
      description="Manajemen pengguna dan data master akan ditambahkan di sini."
    />
  );
}
