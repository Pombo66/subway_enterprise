import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ExpansionJobService } from '../../../../../lib/services/expansion-job.service';
import { getAuthContext, hasExpansionAccess } from '../../../../../lib/middleware/auth';
import { ExpansionLogger } from '../../../../../lib/logging/expansion-logger';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check authorization (only admins can cleanup)
    if (authContext.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // 3. Parse request body for cleanup options
    let body;
    try {
      body = await request.json();
    } catch (error) {
      body = {};
    }

    const olderThanHours = body.olderThanHours || 24;

    // 4. Perform cleanup
    const jobService = new ExpansionJobService(prisma);
    const deletedCount = await jobService.cleanupOldJobs(olderThanHours);

    console.log('Job cleanup completed:', { 
      deletedCount, 
      olderThanHours 
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      olderThanHours,
      message: `Cleaned up ${deletedCount} old jobs older than ${olderThanHours} hours`
    });

  } catch (error: any) {
    ExpansionLogger.logDetailedError(error, {
      endpoint: '/api/expansion/jobs/cleanup'
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to cleanup jobs'
      },
      { status: 500 }
    );
  }
}