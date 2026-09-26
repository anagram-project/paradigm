import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/requireApiRole";
import { saveProject } from "@/lib/kualitasIkuProjects";

export async function POST(request) {
  const guard = await requireApiRole("/dashboard/kualitas-iku");
  if (guard.response) return guard.response;

  try {
    const body = await request.json();
    const { projectName, kedudukan, jabatanSkp, jabatanScale, minIku, maxIku, ikiList, npkValues } = body || {};

    if (!projectName || !String(projectName).trim()) {
      return NextResponse.json({ error: "Nama proyek simulasi wajib diisi." }, { status: 400 });
    }

    const result = await saveProject({
      projectName: String(projectName).trim(),
      kedudukan: kedudukan || "",
      jabatanSkp: jabatanSkp || "",
      jabatanScale: jabatanScale || "lain",
      minIku: minIku ?? "",
      maxIku: maxIku ?? "",
      ikiList: Array.isArray(ikiList) ? ikiList : [],
      npkValues: npkValues || {},
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Gagal menyimpan proyek simulasi." }, { status: 500 });
  }
}
