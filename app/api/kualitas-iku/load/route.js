import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { loadProject } from "@/lib/kualitasIkuProjects";

export async function GET(request) {
  const guard = await requireApiRole("/dashboard/kualitas-iku");
  if (guard.response) return guard.response;

  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get("project");
  if (!projectName) {
    return NextResponse.json({ error: "Parameter project wajib diisi." }, { status: 400 });
  }

  try {
    const data = await loadProject(projectName);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Gagal memuat proyek simulasi." }, { status: 500 });
  }
}
