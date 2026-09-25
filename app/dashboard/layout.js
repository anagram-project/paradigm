import { getSessionUser } from "@/lib/auth";
import DashboardShell from "./DashboardShell";

// Server Component: dijalankan di server tiap request, jadi bisa membaca
// cookie sesi (getSessionUser) untuk tahu siapa yang sedang login. Bagian
// interaktif (menu aktif, tombol logout) dilempar ke DashboardShell (client).
export default async function DashboardLayout({ children }) {
  const session = await getSessionUser();

  const user = {
    nama: session?.nama || "Pengguna",
    jabatan: session?.jabatan || "",
    role: session?.role || "biasa",
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
