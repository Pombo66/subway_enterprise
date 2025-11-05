import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, hasExpansionAccess } from '../../../../lib/middleware/auth';
import { IntelligentExpansionMonitoringService } from '../../../../lib/monitoring/intelligent-expansion-monitoring.service';

/**
 * GET /api/expansion/monitoring
 * Get performance monitoring dashboard for intelligent expansion system
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check authorization
    if (!hasExpansionAccess(authContext.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Expansion feature access required' },
        { status: 403 }
      );
    }

    const monitoringService = IntelligentExpansionMonitoringService.getInstance();
    
    // Get performance dashboard
    const dashboard = monitoringService.generatePerformanceDashboard();
    
    // Get timing metrics
    const timingMetrics = monitoringService.getTimingMetrics();

    return NextResponse.json({
      dashboard,
      timingMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Monitoring API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve monitoring data'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expansion/monitoring
 * Reset monitoring data (for testing/development)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check authorization (admin only for reset)
    if (authContext.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const monitoringService = IntelligentExpansionMonitoringService.getInstance();
    monitoringService.reset();

    return NextResponse.json({
      message: 'Monitoring data reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Monitoring reset error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to reset monitoring data'
      },
      { status: 500 }
    );
  }
}