import { NextResponse } from "next/server";
import { monitoringService } from "@/lib/services/monitoringService";

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
    const isActive = monitoringService.isMonitoring(projectId);
    const monitoringData = await monitoringService.getMonitoringData(projectId);

    return NextResponse.json({
      projectId,
      isActive,
      isMonitoring: isActive,
      status: isActive ? "active" : "inactive",
      lastUpdate: monitoringData?.lastUpdated || new Date().toISOString(),
      health: monitoringData ? "good" : "unknown"
    });
  } catch (error) {
    console.error(`Failed to get monitoring status for project ${projectId}:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve monitoring status" },
      { status: 500 }
    );
  }
}