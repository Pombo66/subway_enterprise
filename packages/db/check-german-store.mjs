#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGermanStore() {
  try {
    console.log('🇩🇪 Checking German store details...');
    
    const germanStore = await prisma.store.findFirst({
      where: {
        country: 'DE'
      },
      select: {
        id: true,
        name: true,
        country: true,
        latitude: true,
        longitude: true,
        status: true,
        annualTurnover: true,
        cityPopulationBand: true
      }
    });

    if (germanStore) {
      console.log('German store found:');
      console.log(JSON.stringify(germanStore, null, 2));
    } else {
      console.log('No German store found');
    }

    // Also check what the query would return with the expansion filter
    const expansionStores = await prisma.store.findMany({
      where: {
        country: 'DE',
        latitude: { not: null },
        longitude: { not: null },
        OR: [
          { status: { not: 'Closed' } },
          { status: null }
        ]
      },
      select: {
        id: true,
        name: true,
        status: true,
        latitude: true,
        longitude: true
      }
    });

    console.log(`\nExpansion query would return ${expansionStores.length} stores:`);
    expansionStores.forEach(store => {
      console.log(`- ${store.name} (status: ${store.status})`);
    });

  } catch (error) {
    console.error('Error checking German store:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGermanStore();