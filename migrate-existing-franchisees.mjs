#!/usr/bin/env node

// Migration script to process existing stores and create franchisees
// This will restore the missing franchisee data

import { PrismaClient } from './packages/db/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function migrateExistingFranchisees() {
  console.log('🚀 FRANCHISEE MIGRATION SCRIPT');
  console.log('===============================\n');

  try {
    // Step 1: Check current state
    console.log('📊 Checking current database state...');
    
    const totalStores = await prisma.store.count();
    const storesWithOwners = await prisma.store.count({
      where: { ownerName: { not: null } }
    });
    const storesWithFranchisees = await prisma.store.count({
      where: { franchiseeId: { not: null } }
    });
    const totalFranchisees = await prisma.franchisee.count();

    console.log(`  - Total stores: ${totalStores}`);
    console.log(`  - Stores with ownerName: ${storesWithOwners}`);
    console.log(`  - Stores with franchiseeId: ${storesWithFranchisees}`);
    console.log(`  - Total franchisees: ${totalFranchisees}\n`);

    if (storesWithOwners === 0) {
      console.log('❌ No stores with ownerName found. Nothing to migrate.');
      return;
    }

    if (storesWithOwners === storesWithFranchisees) {
      console.log('✅ All stores with ownerName already have franchiseeId. Migration not needed.');
      return;
    }

    // Step 2: Show what will be migrated
    const storesToMigrate = await prisma.store.findMany({
      where: {
        ownerName: { not: null },
        franchiseeId: null
      },
      select: {
        ownerName: true
      }
    });

    const uniqueOwners = [...new Set(storesToMigrate.map(s => s.ownerName).filter(Boolean))];
    console.log(`🔄 Will process ${storesToMigrate.length} stores with ${uniqueOwners.length} unique owners:`);
    uniqueOwners.forEach(owner => {
      const count = storesToMigrate.filter(s => s.ownerName === owner).length;
      console.log(`  - "${owner}": ${count} stores`);
    });

    console.log('\n⚠️  This will create franchisee records and link stores to them.');
    console.log('⚠️  This operation modifies production data!\n');

    // Step 3: Perform migration
    console.log('🚀 Starting migration...\n');

    const stats = {
      franchiseesCreated: 0,
      storesLinked: 0,
      errors: 0
    };

    // Process each unique owner
    for (const ownerName of uniqueOwners) {
      try {
        console.log(`👤 Processing owner: "${ownerName}"`);

        // Check if franchisee already exists
        let franchisee = await prisma.franchisee.findFirst({
          where: {
            name: {
              equals: ownerName,
              mode: 'insensitive'
            }
          }
        });

        if (!franchisee) {
          // Create new franchisee
          franchisee = await prisma.franchisee.create({
            data: {
              name: ownerName,
              joinedDate: new Date(),
              status: 'ACTIVE',
              totalStores: 0,
              activeStores: 0
            }
          });
          stats.franchiseesCreated++;
          console.log(`  ✅ Created franchisee: ${franchisee.id}`);
        } else {
          console.log(`  🔗 Found existing franchisee: ${franchisee.id}`);
        }

        // Link stores to franchisee
        const updateResult = await prisma.store.updateMany({
          where: {
            ownerName: ownerName,
            franchiseeId: null
          },
          data: {
            franchiseeId: franchisee.id
          }
        });

        stats.storesLinked += updateResult.count;
        console.log(`  🔗 Linked ${updateResult.count} stores to franchisee`);

        // Update franchisee metrics
        const stores = await prisma.store.findMany({
          where: { franchiseeId: franchisee.id },
          include: {
            Orders: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        });

        const totalStores = stores.length;
        const activeStores = stores.filter(s => s.status === 'ACTIVE').length;
        const totalRevenue = stores.reduce((sum, store) => {
          const storeRevenue = store.Orders.reduce((orderSum, order) => {
            return orderSum + Number(order.total);
          }, 0);
          return sum + storeRevenue;
        }, 0);
        const avgStoreRevenue = activeStores > 0 ? totalRevenue / activeStores : 0;

        await prisma.franchisee.update({
          where: { id: franchisee.id },
          data: {
            totalStores,
            activeStores,
            totalRevenue,
            avgStoreRevenue
          }
        });

        console.log(`  📊 Updated metrics: ${totalStores} total, ${activeStores} active, $${totalRevenue.toFixed(2)} revenue\n`);

      } catch (error) {
        console.error(`❌ Error processing "${ownerName}":`, error);
        stats.errors++;
      }
    }

    // Step 4: Final verification
    console.log('✅ Migration completed!\n');
    console.log('📊 MIGRATION RESULTS:');
    console.log(`  - Franchisees created: ${stats.franchiseesCreated}`);
    console.log(`  - Stores linked: ${stats.storesLinked}`);
    console.log(`  - Errors: ${stats.errors}\n`);

    // Verify final state
    const finalStoresWithFranchisees = await prisma.store.count({
      where: { franchiseeId: { not: null } }
    });
    const finalTotalFranchisees = await prisma.franchisee.count();

    console.log('📊 FINAL STATE:');
    console.log(`  - Total franchisees: ${finalTotalFranchisees}`);
    console.log(`  - Stores with franchiseeId: ${finalStoresWithFranchisees}/${totalStores}`);

    if (finalStoresWithFranchisees > storesWithFranchisees) {
      console.log(`✅ SUCCESS: ${finalStoresWithFranchisees - storesWithFranchisees} additional stores now linked to franchisees!`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateExistingFranchisees().catch(console.error);