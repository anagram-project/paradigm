import { requireMenuAccess } from "@/lib/requireMenuAccess";
import TeladanVotingClient from "./TeladanVotingClient";

export default async function PegawaiTeladanPage() {
  await requireMenuAccess("/dashboard/pegawai-teladan");
  return <TeladanVotingClient />;
}
