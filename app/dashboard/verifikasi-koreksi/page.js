import { requireMenuAccess } from "@/lib/requireMenuAccess";
import Placeholder from "../_components/Placeholder";

export default async function VerifikasiKoreksiPage() {
  await requireMenuAccess("/dashboard/verifikasi-koreksi");

  return (
    <Placeholder
      title="Verifikasi Koreksi Nilai"
      description="Verifikasi dan persetujuan bukti dukung koreksi nilai oleh LO Subdit akan ditambahkan di sini."
    />
  );
}
