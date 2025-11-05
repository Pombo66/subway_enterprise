import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CacheCleanupService } from '../../../../../lib/services/cache-cleanup.service';
import { getAuthContext } from '../../../../../lib/middleware/auth';

const prisma = new PrismaClient();

// POST /api/expansion/cache/cleanup - Manually trigger cache cleanup
export async function POST(request: NextRequest) {
  try {
    // Check authentication - only admins can trigger cleanup
    const authContext = await getAuthContext(request);
    if (!authContext || authContext.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const service = new CacheCleanupService(prisma);
    const result = await service.cleanupExpiredEntries();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cache cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// GET /api/expansion/cache/cleanup - Get cache statistics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = new CacheCleanupService(prisma);
    const stats = await service.getCacheStats();

    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
