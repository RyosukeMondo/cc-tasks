import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// Mock monitoring data for development
const generateMockMonitoringData = () => ({
  sessionCount: Math.floor(Math.random() * 10) + 1,
  activeCount: Math.floor(Math.random() * 3),
  averageTokens: Math.floor(Math.random() * 1000) + 500,
  lastActivity: new Date().toISOString(),
  status: "active" as const,
  metrics: {
    totalRequests: Math.floor(Math.random() * 100) + 50,
    errorRate: Math.random() * 0.05,
    averageResponseTime: Math.floor(Math.random() * 200) + 100,
  }
});

export async function GET(_request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    // For now, return mock data
    // TODO: Implement actual monitoring data collection
    const monitoringData = generateMockMonitoringData();

    return NextResponse.json({
      projectId,
      monitoring: monitoringData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to get monitoring data for project ${projectId}:`, error);
    return NextResponse.json(
      { error: "Failed to retrieve monitoring data" },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    // Mock start monitoring
    return NextResponse.json({
      projectId,
      status: "started",
      message: "Monitoring started successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to start monitoring for project ${projectId}:`, error);
    return NextResponse.json(
      { error: "Failed to start monitoring" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: projectId } = await context.params;

  if (!projectId) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    // Mock stop monitoring
    return NextResponse.json({
      projectId,
      status: "stopped",
      message: "Monitoring stopped successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to stop monitoring for project ${projectId}:`, error);
    return NextResponse.json(
      { error: "Failed to stop monitoring" },
      { status: 500 }
    );
  }
}