import { NextResponse } from "next/server";

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
    // Mock monitoring status
    const isActive = Math.random() > 0.3; // 70% chance of being active

    return NextResponse.json({
      projectId,
      isMonitoring: isActive,
      status: isActive ? "active" : "inactive",
      lastUpdate: new Date().toISOString(),
      health: "good"
    });
  } catch (error) {
    console.error(`Failed to get monitoring status for project ${projectId}:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve monitoring status" },
      { status: 500 }
    );
  }
}