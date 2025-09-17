import { NextRequest, NextResponse } from 'next/server';
import { monitoringService } from '@/lib/services/monitoringService';
import { 
  SessionControlRequest, 
  MonitoringConfig 
} from '@/lib/types/monitoring';

// GET /api/projects/[id]/monitoring
// Returns monitoring data for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    // Handle specific session update request
    if (sessionId && action === 'session-update') {
      const sessionUpdate = await monitoringService.getSessionUpdate(projectId, sessionId);
      
      if (!sessionUpdate) {
        return NextResponse.json(
          { error: 'Session not found or monitoring not active' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: sessionUpdate
      });
    }

    // Handle monitoring status check
    if (action === 'status') {
      const isMonitoring = monitoringService.isMonitoring(projectId);
      const activeProjects = monitoringService.getActiveProjects();
      
      return NextResponse.json({
        success: true,
        data: {
          isMonitoring,
          projectId,
          activeProjects
        }
      });
    }

    // Get full monitoring data
    const monitoringData = await monitoringService.getMonitoringData(projectId);
    
    if (!monitoringData) {
      return NextResponse.json(
        { error: 'Monitoring not active for this project' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: monitoringData
    });

  } catch (error) {
    console.error('Monitoring API GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/monitoring
// Handles monitoring control operations
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, ...requestData } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Handle monitoring lifecycle actions
    switch (action) {
      case 'start-monitoring': {
        const config: Partial<MonitoringConfig> = requestData.config || {};
        
        // Validate config if provided
        if (config.pollInterval && config.pollInterval < 1000) {
          return NextResponse.json(
            { error: 'Poll interval must be at least 1000ms' },
            { status: 400 }
          );
        }

        await monitoringService.startMonitoring(projectId, config);
        
        return NextResponse.json({
          success: true,
          message: `Monitoring started for project ${projectId}`,
          data: { projectId, config }
        });
      }

      case 'stop-monitoring': {
        await monitoringService.stopMonitoring(projectId);
        
        return NextResponse.json({
          success: true,
          message: `Monitoring stopped for project ${projectId}`,
          data: { projectId }
        });
      }

      case 'update-config': {
        const config: Partial<MonitoringConfig> = requestData.config;
        
        if (!config) {
          return NextResponse.json(
            { error: 'Config is required for update-config action' },
            { status: 400 }
          );
        }

        // Validate config
        if (config.pollInterval && config.pollInterval < 1000) {
          return NextResponse.json(
            { error: 'Poll interval must be at least 1000ms' },
            { status: 400 }
          );
        }

        monitoringService.updateConfig(projectId, config);
        
        return NextResponse.json({
          success: true,
          message: `Monitoring configuration updated for project ${projectId}`,
          data: { projectId, config }
        });
      }

      case 'session-control': {
        // Validate session control request
        const controlRequest: SessionControlRequest = {
          projectId,
          sessionId: requestData.sessionId,
          action: requestData.controlAction,
          reason: requestData.reason,
          force: requestData.force
        };

        if (!controlRequest.sessionId || !controlRequest.action) {
          return NextResponse.json(
            { error: 'sessionId and controlAction are required for session-control' },
            { status: 400 }
          );
        }

        // Validate control action
        const validActions = ['pause', 'resume', 'terminate', 'restart'];
        if (!validActions.includes(controlRequest.action)) {
          return NextResponse.json(
            { error: `Invalid control action. Must be one of: ${validActions.join(', ')}` },
            { status: 400 }
          );
        }

        const result = await monitoringService.executeSessionControl(controlRequest);
        
        return NextResponse.json({
          success: result.success,
          message: result.message || `Session control ${controlRequest.action} executed`,
          data: result
        }, {
          status: result.success ? 200 : 400
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Monitoring API POST error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/monitoring
// Alternative endpoint for configuration updates
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const config: Partial<MonitoringConfig> = await request.json();
    
    // Validate config
    if (config.pollInterval && config.pollInterval < 1000) {
      return NextResponse.json(
        { error: 'Poll interval must be at least 1000ms' },
        { status: 400 }
      );
    }

    if (config.maxSessions && config.maxSessions < 1) {
      return NextResponse.json(
        { error: 'Max sessions must be at least 1' },
        { status: 400 }
      );
    }

    monitoringService.updateConfig(projectId, config);
    
    return NextResponse.json({
      success: true,
      message: `Monitoring configuration updated for project ${projectId}`,
      data: { projectId, config }
    });

  } catch (error) {
    console.error('Monitoring API PUT error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/monitoring
// Stops monitoring and cleans up resources
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    await monitoringService.stopMonitoring(projectId);
    
    return NextResponse.json({
      success: true,
      message: `Monitoring stopped and resources cleaned up for project ${projectId}`,
      data: { projectId }
    });

  } catch (error) {
    console.error('Monitoring API DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}