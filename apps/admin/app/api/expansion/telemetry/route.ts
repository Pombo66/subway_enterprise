import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getAuthContext, hasExpansionAccess } from '../../../../lib/middleware/auth';

const prisma = new PrismaClient();

// GET /api/expansion/telemetry - Get expansion telemetry metrics
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasExpansionAccess(authContext.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Expansion feature access required' },
        { status: 403 }
      );
    }

    // Get cache statistics
    const [mapboxCacheCount, openaiCacheCount, mapboxCacheSize, openaiCacheSize] = await Promise.all([
      prisma.mapboxTilequeryCache.count(),
      prisma.openAIRationaleCache.count(),
      prisma.mapboxTilequeryCache.aggregate({
        _sum: {
          roadDistanceM: true,
          buildingDistanceM: true
        }
      }),
      prisma.openAIRationaleCache.aggregate({
        _sum: {
          tokensUsed: true
        }
      })
    ]);

    // Get recent cache entries to calculate hit rate (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [recentMapboxEntries, recentOpenAIEntries] = await Promise.all([
      prisma.mapboxTilequeryCache.count({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      }),
      prisma.openAIRationaleCache.count({
        where: {
          createdAt: {
            gte: oneDayAgo
          }
        }
      })
    ]);

    // Get scenario statistics
    const [totalScenarios, totalSuggestions, suggestionsByStatus] = await Promise.all([
      prisma.expansionScenario.count(),
      prisma.expansionSuggestion.count(),
      prisma.expansionSuggestion.groupBy({
        by: ['status'],
        _count: true
      })
    ]);

    // Calculate status breakdown
    const statusBreakdown = suggestionsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Get average generation metrics from recent scenarios
    const recentScenarios = await prisma.expansionScenario.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      },
      include: {
        _count: {
          select: { suggestions: true }
        }
      },
      take: 100
    });

    const avgSuggestionsPerScenario = recentScenarios.length > 0
      ? recentScenarios.reduce((sum, s) => sum + s._count.suggestions, 0) / recentScenarios.length
      : 0;

    return NextResponse.json({
      mapbox: {
        totalCacheEntries: mapboxCacheCount,
        recentEntries24h: recentMapboxEntries,
        estimatedApiCalls: mapboxCacheCount, // Each cache entry = 1 API call
        cacheHitRate: mapboxCacheCount > 0 ? ((mapboxCacheCount - recentMapboxEntries) / mapboxCacheCount * 100).toFixed(2) : 0
      },
      openai: {
        totalCacheEntries: openaiCacheCount,
        recentEntries24h: recentOpenAIEntries,
        totalTokensUsed: openaiCacheSize._sum.tokensUsed || 0,
        estimatedApiCalls: openaiCacheCount,
        cacheHitRate: openaiCacheCount > 0 ? ((openaiCacheCount - recentOpenAIEntries) / openaiCacheCount * 100).toFixed(2) : 0
      },
      scenarios: {
        total: totalScenarios,
        totalSuggestions,
        avgSuggestionsPerScenario: avgSuggestionsPerScenario.toFixed(1),
        statusBreakdown,
        recentScenarios24h: recentScenarios.length
      },
      performance: {
        avgGenerationTimeMs: null, // Would need to track this separately
        cacheEfficiency: {
          mapbox: `${mapboxCacheCount > 0 ? ((mapboxCacheCount - recentMapboxEntries) / mapboxCacheCount * 100).toFixed(1) : 0}%`,
          openai: `${openaiCacheCount > 0 ? ((openaiCacheCount - recentOpenAIEntries) / openaiCacheCount * 100).toFixed(1) : 0}%`
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Telemetry error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
