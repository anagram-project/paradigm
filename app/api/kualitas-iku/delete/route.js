import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { deleteProject } from "@/lib/kualitasIkuProjects";

export async function POST(request) {
  const guard = await requireApiRole("/dashboard/kualitas-iku");
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { projectName } = body || {};

    if (!projectName || !String(projectName).trim()) {
      return NextResponse.json({ error: "Nama proyek wajib diisi." }, { status: 400 });
    }

    const result = await deleteProject(String(projectName).trim());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message || "Gagal menghapus proyek simulasi." }, { status: 500 });
  }
}
