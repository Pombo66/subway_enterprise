import prisma from '../db';
import { Franchisee } from '@prisma/client';

export interface FranchiseeProcessingResult {
  franchiseeId: string;
  isNew: boolean;
  franchisee: Franchisee;
}

export class FranchiseeProcessor {
  /**
   * Process owner name and create/find franchisee
   * Returns franchisee ID to link to store
   */
  static async processOwnerName(ownerName: string): Promise<FranchiseeProcessingResult | null> {
    if (!ownerName || ownerName.trim() === '') {
      return null;
    }

    const normalizedName = ownerName.trim();

    try {
      // First, try to find existing franchisee by name
      let franchisee = await prisma.franchisee.findFirst({
        where: {
          name: {
            equals: normalizedName,
            mode: 'insensitive'
          }
        }
      });

      if (franchisee) {
        return {
          franchiseeId: franchisee.id,
          isNew: false,
          franchisee
        };
      }

      // Create new franchisee
      franchisee = await prisma.franchisee.create({
        data: {
          name: normalizedName,
          joinedDate: new Date(),
          status: 'ACTIVE',
          totalStores: 0,
          activeStores: 0
        }
      });

      return {
        franchiseeId: franchisee.id,
        isNew: true,
        franchisee
      };

    } catch (error) {
      console.error(`❌ Error processing franchisee "${normalizedName}":`, error);
      return null;
    }
  }

  /**
   * Batch process multiple owner names
   * Returns map of ownerName -> franchiseeId
   */
  static async batchProcessOwnerNames(ownerNames: string[]): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const uniqueNames = [...new Set(ownerNames.filter(name => name && name.trim()))];

    for (const ownerName of uniqueNames) {
      const processed = await this.processOwnerName(ownerName);
      if (processed) {
        result.set(ownerName, processed.franchiseeId);
      }
    }

    return result;
  }

  /**
   * Update franchisee metrics after stores are linked
   */
  static async updateFranchiseeMetrics(franchiseeId: string): Promise<void> {
    try {
      const stores = await prisma.store.findMany({
        where: { franchiseeId },
        include: {
          Orders: {
            where: {
              createdAt: {
                gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
              }
            }
          }
        }
      });

      const totalStores = stores.length;
      const activeStores = stores.filter(s => s.status === 'ACTIVE').length;

      // Calculate total revenue from orders
      const totalRevenue = stores.reduce((sum, store) => {
        const storeRevenue = store.Orders.reduce((orderSum, order) => {
          return orderSum + Number(order.total);
        }, 0);
        return sum + storeRevenue;
      }, 0);

      const avgStoreRevenue = activeStores > 0 ? totalRevenue / activeStores : 0;

      // Update franchisee metrics
      await prisma.franchisee.update({
        where: { id: franchiseeId },
        data: {
          totalStores,
          activeStores,
          totalRevenue,
          avgStoreRevenue
        }
      });

    } catch (error) {
      console.error(`❌ Error updating metrics for franchisee ${franchiseeId}:`, error);
    }
  }

  /**
   * Migrate existing stores with ownerName to franchisees
   */
  static async migrateExistingStores(): Promise<{
    processed: number;
    franchiseesCreated: number;
    storesLinked: number;
    errors: number;
  }> {
    console.log('🔄 Starting migration of existing stores to franchisees...');

    const stats = {
      processed: 0,
      franchiseesCreated: 0,
      storesLinked: 0,
      errors: 0
    };

    try {
      // Get all stores with ownerName but no franchiseeId
      const stores = await prisma.store.findMany({
        where: {
          ownerName: { not: null },
          franchiseeId: null
        },
        select: {
          id: true,
          ownerName: true,
          name: true,
          city: true
        }
      });

      console.log(`📊 Found ${stores.length} stores with ownerName to process`);

      // Group stores by ownerName to batch process
      const storesByOwner = new Map<string, typeof stores>();
      stores.forEach(store => {
        if (store.ownerName) {
          if (!storesByOwner.has(store.ownerName)) {
            storesByOwner.set(store.ownerName, []);
          }
          storesByOwner.get(store.ownerName)!.push(store);
        }
      });

      console.log(`👥 Processing ${storesByOwner.size} unique owner names`);

      // Process each owner name
      for (const [ownerName, ownerStores] of storesByOwner) {
        try {
          stats.processed++;

          const result = await this.processOwnerName(ownerName);
          if (!result) {
            console.warn(`⚠️ Could not process owner: "${ownerName}"`);
            stats.errors++;
            continue;
          }

          if (result.isNew) {
            stats.franchiseesCreated++;
            console.log(`✅ Created franchisee: "${ownerName}" (${result.franchiseeId})`);
          } else {
            console.log(`🔗 Found existing franchisee: "${ownerName}" (${result.franchiseeId})`);
          }

          // Link all stores for this owner to the franchisee
          const storeIds = ownerStores.map(s => s.id);
          await prisma.store.updateMany({
            where: { id: { in: storeIds } },
            data: { franchiseeId: result.franchiseeId }
          });

          stats.storesLinked += ownerStores.length;
          console.log(`🔗 Linked ${ownerStores.length} stores to franchisee "${ownerName}"`);

          // Update franchisee metrics
          await this.updateFranchiseeMetrics(result.franchiseeId);

        } catch (error) {
          console.error(`❌ Error processing owner "${ownerName}":`, error);
          stats.errors++;
        }
      }

      console.log('✅ Migration completed!');
      console.log(`📊 Final stats:`, stats);

      return stats;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }
}