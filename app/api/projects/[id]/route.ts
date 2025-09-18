import { NextResponse } from "next/server";

import { projectService } from "@/lib/services/projectService";
import { sessionService } from "@/lib/services/sessionService";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    const projects = await projectService.listProjects();
    const project = projects.find((item) => item.id === projectId);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sessions = await sessionService.listSessionsForProject(projectId);

    return NextResponse.json({ project, sessions });
  } catch (error) {
    console.error(`Failed to load project ${projectId}:`, error);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}
