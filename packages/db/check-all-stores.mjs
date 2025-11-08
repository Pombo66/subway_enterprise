#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStores() {
  try {
    const totalStores = await prisma.store.count();
    console.log(`\n📊 Total stores in database: ${totalStores}\n`);

    if (totalStores > 0) {
      const stores = await prisma.store.findMany({
        take: 5
      });

      console.log('Sample stores:');
      stores.forEach(store => {
        console.log(`\nStore: ${store.name}`);
        console.log(`  ID: ${store.id}`);
        console.log(`  City: ${store.city || 'N/A'}`);
        console.log(`  Country: ${store.country || 'N/A'}`);
        console.log(`  Owner Name: ${store.ownerName || '❌ NULL'}`);
        console.log(`  Status: ${store.status || 'N/A'}`);
        console.log(`  Lat/Lng: ${store.latitude}, ${store.longitude}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStores();
