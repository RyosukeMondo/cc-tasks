import { NextResponse } from "next/server";

import { conversationService } from "@/lib/services/conversationService";
import { projectService } from "@/lib/services/projectService";

interface RouteContext {
  params: Promise<{
    id?: string;
    sessionId?: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const projectId = params?.id;
  const sessionId = params?.sessionId;

  if (!projectId || !sessionId) {
    return NextResponse.json({ error: "Project ID and session ID are required" }, { status: 400 });
  }

  try {
    const projects = await projectService.listProjects();
    const project = projects.find((item) => item.id === projectId) ?? null;

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const entries = await conversationService.parseConversationFile(projectId, sessionId);
    const stats = conversationService.getSessionStats(entries);

    return NextResponse.json({ project, entries, stats });
  } catch (error) {
    console.error(`Failed to load session ${sessionId} for project ${projectId}:`, error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
