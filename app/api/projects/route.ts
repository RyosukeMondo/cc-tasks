import { NextResponse } from "next/server";

import { projectService } from "@/lib/services/projectService";

export async function GET() {
  try {
    const projects = await projectService.listProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error("Failed to list projects:", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}
