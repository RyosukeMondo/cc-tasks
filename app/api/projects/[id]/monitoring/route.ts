import { NextResponse } from "next/server";
import { monitoringService } from "@/lib/services/monitoringService";
import { SessionControlRequest } from "@/lib/types/monitoring";

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
    // Get real monitoring data from the service
    const monitoringData = await monitoringService.getMonitoringData(projectId);

    if (!monitoringData) {
      return NextResponse.json({
        projectId,
        sessions: [],
        overallStats: {
          activeSessions: 0,
          totalSessions: 0,
          averageResponseTime: 0,
          systemLoad: 0
        },
        lastUpdated: new Date().toISOString(),
        config: {
          pollInterval: 2000,
          healthCheckInterval: 5000,
          staleThreshold: 300000,
          maxSessions: 25,
          enableAutoRecovery: true,
          enableNotifications: false
        }
      });
    }

    return NextResponse.json(monitoringData);
  } catch (error) {
    console.error(`Failed to get monitoring data for project ${projectId}:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve monitoring data" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { action, config, request: controlRequest } = body;

    switch (action) {
      case 'start':
        await monitoringService.startMonitoring(projectId, config);
        return NextResponse.json({
          projectId,
          status: "started",
          message: "Monitoring started successfully",
          timestamp: new Date().toISOString()
        });

      case 'stop':
        await monitoringService.stopMonitoring(projectId);
        return NextResponse.json({
          projectId,
          status: "stopped",
          message: "Monitoring stopped successfully",
          timestamp: new Date().toISOString()
        });

      case 'control':
        const result = await monitoringService.executeSessionControl(controlRequest as SessionControlRequest);
        return NextResponse.json(result);

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error(`Failed to execute monitoring action for project ${projectId}:`, error);
    return NextResponse.json(
      { error: "Failed to execute monitoring action" },
      { status: 500 }
    );
  }
}

// DELETE method removed - now handled by POST with action: 'stop'