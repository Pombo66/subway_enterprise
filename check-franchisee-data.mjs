#!/usr/bin/env node

import { PrismaClient } from './packages/db/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function checkFranchiseeData() {
  try {
    console.log('🔍 Checking franchisee data regression...\n');

    // Check total stores
    const totalStores = await prisma.store.count();
    console.log(`📊 Total stores: ${totalStores}`);

    // Check stores with ownerName
    const storesWithOwners = await prisma.store.count({
      where: { ownerName: { not: null } }
    });
    console.log(`👤 Stores with ownerName: ${storesWithOwners}`);

    // Check stores with franchiseeId
    const storesWithFranchisees = await prisma.store.count({
      where: { franchiseeId: { not: null } }
    });
    console.log(`🏢 Stores with franchiseeId: ${storesWithFranchisees}`);

    // Check total franchisees
    const totalFranchisees = await prisma.franchisee.count();
    console.log(`👥 Total franchisees: ${totalFranchisees}\n`);

    if (storesWithOwners > 0) {
      console.log('📋 Sample stores with ownerName:');
      const sampleStores = await prisma.store.findMany({
        where: { ownerName: { not: null } },
        select: {
          id: true,
          name: true,
          ownerName: true,
          franchiseeId: true,
          city: true,
          country: true
        },
        take: 5
      });

      sampleStores.forEach(store => {
        console.log(`  - ${store.name} | Owner: "${store.ownerName}" | FranchiseeId: ${store.franchiseeId || 'NULL'} | ${store.city}, ${store.country}`);
      });

      console.log('\n📈 Owner name frequency:');
      const ownerStats = await prisma.store.groupBy({
        by: ['ownerName'],
        _count: { ownerName: true },
        where: { ownerName: { not: null } },
        orderBy: { _count: { ownerName: 'desc' } },
        take: 10
      });

      ownerStats.forEach(stat => {
        console.log(`  - "${stat.ownerName}": ${stat._count.ownerName} stores`);
      });
    }

    console.log('\n🔍 DIAGNOSIS:');
    if (storesWithOwners > 0 && storesWithFranchisees === 0 && totalFranchisees === 0) {
      console.log('❌ REGRESSION CONFIRMED: ownerName data exists but no franchisees created');
      console.log('💡 SOLUTION: Need to restore franchisee processing in store upload system');
    } else if (totalFranchisees > 0 && storesWithFranchisees === 0) {
      console.log('❌ PARTIAL REGRESSION: Franchisees exist but stores not linked');
      console.log('💡 SOLUTION: Need to link existing stores to franchisees');
    } else {
      console.log('✅ No obvious regression detected');
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFranchiseeData();