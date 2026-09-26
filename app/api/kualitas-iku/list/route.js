import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { listProjects } from "@/lib/kualitasIkuProjects";

export async function GET() {
  const guard = await requireApiRole("/dashboard/kualitas-iku");
  if (guard.response) return guard.response;

  try {
    const projects = await listProjects();
    return NextResponse.json({ ok: true, projects });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal memuat daftar proyek." }, { status: 500 });
  }
}
