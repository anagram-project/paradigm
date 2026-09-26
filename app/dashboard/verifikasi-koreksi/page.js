import { requireMenuAccess } from "@/lib/requireMenuAccess";
import VerifikasiKoreksiClient from "./VerifikasiKoreksiClient";

export default async function VerifikasiKoreksiPage() {
  await requireMenuAccess("/dashboard/verifikasi-koreksi");

  return <VerifikasiKoreksiClient />;
}
