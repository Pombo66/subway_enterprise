#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStores() {
  try {
    console.log('🏪 Checking available stores in database...');
    
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        country: true,
        latitude: true,
        longitude: true
      },
      take: 10
    });

    console.log(`Found ${stores.length} stores:`);
    stores.forEach(store => {
      console.log(`- ${store.name} (${store.country}) at ${store.latitude}, ${store.longitude}`);
    });

    const countries = await prisma.store.groupBy({
      by: ['country'],
      _count: {
        country: true
      }
    });

    console.log('\nStores by country:');
    countries.forEach(country => {
      console.log(`- ${country.country}: ${country._count.country} stores`);
    });

  } catch (error) {
    console.error('Error checking stores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStores();