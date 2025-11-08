#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOwnerNames() {
  try {
    const stores = await prisma.store.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        ownerName: true,
        city: true,
        country: true
      }
    });

    console.log('\n📊 Sample stores with owner names:');
    console.log('=====================================\n');
    
    stores.forEach(store => {
      console.log(`Store: ${store.name}`);
      console.log(`  City: ${store.city || 'N/A'}`);
      console.log(`  Country: ${store.country || 'N/A'}`);
      console.log(`  Owner Name: ${store.ownerName || '❌ NULL/EMPTY'}`);
      console.log('');
    });

    const storesWithOwners = stores.filter(s => s.ownerName);
    const storesWithoutOwners = stores.filter(s => !s.ownerName);

    console.log(`\n✅ Stores with owner names: ${storesWithOwners.length}/${stores.length}`);
    console.log(`❌ Stores without owner names: ${storesWithoutOwners.length}/${stores.length}`);

    // Check total count
    const totalWithOwners = await prisma.store.count({
      where: {
        ownerName: {
          not: null
        }
      }
    });

    const totalStores = await prisma.store.count();

    console.log(`\n📈 Total database stats:`);
    console.log(`  Total stores: ${totalStores}`);
    console.log(`  Stores with owner names: ${totalWithOwners}`);
    console.log(`  Stores without owner names: ${totalStores - totalWithOwners}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOwnerNames();
