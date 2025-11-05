import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, hasExpansionAccess } from '../../../../lib/middleware/auth';
import { IntelligentExpansionErrorHandler } from '../../../../lib/services/error-handling/intelligent-expansion-error-handler.service';

/**
 * GET /api/expansion/health
 * Get health status and error statistics for intelligent expansion system
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

    const errorHandler = IntelligentExpansionErrorHandler.getInstance();
    
    // Get service health status
    const serviceHealth = errorHandler.getServiceHealth();
    
    // Get error statistics
    const errorStatistics = errorHandler.getErrorStatistics();

    // Determine overall system health
    const healthStatuses = Array.isArray(serviceHealth) ? serviceHealth : [serviceHealth];
    const overallHealth = healthStatuses.every(h => h.status === 'OPERATIONAL') ? 'HEALTHY' :
                         healthStatuses.some(h => h.status === 'DOWN') ? 'CRITICAL' :
                         healthStatuses.some(h => h.status === 'FAILING') ? 'DEGRADED' : 'WARNING';

    return NextResponse.json({
      overallHealth,
      serviceHealth,
      errorStatistics,
      timestamp: new Date().toISOString(),
      summary: {
        totalServices: healthStatuses.length,
        healthyServices: healthStatuses.filter(h => h.status === 'OPERATIONAL').length,
        degradedServices: healthStatuses.filter(h => h.status === 'DEGRADED').length,
        failingServices: healthStatuses.filter(h => h.status === 'FAILING').length,
        downServices: healthStatuses.filter(h => h.status === 'DOWN').length
      }
    });

  } catch (error: any) {
    console.error('Health API error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve health data'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/expansion/health
 * Reset error handling state (for testing/development)
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

    const errorHandler = IntelligentExpansionErrorHandler.getInstance();
    errorHandler.reset();

    return NextResponse.json({
      message: 'Error handling state reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Health reset error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to reset health state'
      },
      { status: 500 }
    );
  }
}