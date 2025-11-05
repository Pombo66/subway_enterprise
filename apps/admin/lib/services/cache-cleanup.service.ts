import { PrismaClient } from '@prisma/client';

export class CacheCleanupService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredEntries(): Promise<{
    mapboxDeleted: number;
    openaiDeleted: number;
    totalDeleted: number;
  }> {
    const now = new Date();

    try {
      // Delete expired Mapbox cache entries
      const mapboxResult = await this.prisma.mapboxTilequeryCache.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      });

      // Delete expired OpenAI cache entries
      const openaiResult = await this.prisma.openAIRationaleCache.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      });

      const totalDeleted = mapboxResult.count + openaiResult.count;

      console.log(`🧹 Cache cleanup completed: ${totalDeleted} entries deleted (Mapbox: ${mapboxResult.count}, OpenAI: ${openaiResult.count})`);

      return {
        mapboxDeleted: mapboxResult.count,
        openaiDeleted: openaiResult.count,
        totalDeleted
      };
    } catch (error) {
      console.error('Cache cleanup error:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    mapbox: {
      total: number;
      expired: number;
      active: number;
    };
    openai: {
      total: number;
      expired: number;
      active: number;
    };
  }> {
    const now = new Date();

    const [
      mapboxTotal,
      mapboxExpired,
      openaiTotal,
      openaiExpired
    ] = await Promise.all([
      this.prisma.mapboxTilequeryCache.count(),
      this.prisma.mapboxTilequeryCache.count({
        where: { expiresAt: { lt: now } }
      }),
      this.prisma.openAIRationaleCache.count(),
      this.prisma.openAIRationaleCache.count({
        where: { expiresAt: { lt: now } }
      })
    ]);

    return {
      mapbox: {
        total: mapboxTotal,
        expired: mapboxExpired,
        active: mapboxTotal - mapboxExpired
      },
      openai: {
        total: openaiTotal,
        expired: openaiExpired,
        active: openaiTotal - openaiExpired
      }
    };
  }

  /**
   * Clean up old scenarios (optional - for maintenance)
   */
  async cleanupOldScenarios(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.expansionScenario.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`🧹 Deleted ${result.count} scenarios older than ${daysOld} days`);

    return result.count;
  }
}
