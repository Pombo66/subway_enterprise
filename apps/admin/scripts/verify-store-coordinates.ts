#!/usr/bin/env ts-node
/**
 * Script to verify store coordinates in the database
 * Run with: npx ts-node apps/admin/scripts/verify-store-coordinates.ts
 */

import prisma from '../lib/db';

async function verifyStoreCoordinates() {
  console.log('🔍 Verifying store coordinates in database...\n');

  try {
    // Get all stores
    const allStores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        latitude: true,
        longitude: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total stores in database: ${allStores.length}\n`);

    // Categorize stores
    const storesWithCoords = allStores.filter(s => 
      s.latitude !== null && 
      s.longitude !== null &&
      !isNaN(s.latitude) &&
      !isNaN(s.longitude)
    );

    const storesWithoutCoords = allStores.filter(s => 
      s.latitude === null || 
      s.longitude === null ||
      isNaN(s.latitude) ||
      isNaN(s.longitude)
    );

    console.log(`✅ Stores with valid coordinates: ${storesWithCoords.length}`);
    console.log(`❌ Stores without coordinates: ${storesWithoutCoords.length}\n`);

    // Show stores with coordinates
    if (storesWithCoords.length > 0) {
      console.log('📍 Stores with coordinates:');
      storesWithCoords.slice(0, 10).forEach(store => {
        console.log(`  - ${store.name} (${store.city}, ${store.country})`);
        console.log(`    Coordinates: (${store.latitude}, ${store.longitude})`);
        console.log(`    Created: ${store.createdAt.toISOString()}`);
      });
      
      if (storesWithCoords.length > 10) {
        console.log(`  ... and ${storesWithCoords.length - 10} more\n`);
      }
    }

    // Show stores without coordinates
    if (storesWithoutCoords.length > 0) {
      console.log('\n⚠️  Stores missing coordinates:');
      storesWithoutCoords.slice(0, 10).forEach(store => {
        console.log(`  - ${store.name} (${store.city}, ${store.country})`);
        console.log(`    Coordinates: (${store.latitude}, ${store.longitude})`);
        console.log(`    Created: ${store.createdAt.toISOString()}`);
      });
      
      if (storesWithoutCoords.length > 10) {
        console.log(`  ... and ${storesWithoutCoords.length - 10} more\n`);
      }
    }

    // Coordinate validation
    const invalidCoords = storesWithCoords.filter(s => 
      s.latitude! < -90 || s.latitude! > 90 ||
      s.longitude! < -180 || s.longitude! > 180
    );

    if (invalidCoords.length > 0) {
      console.log('\n⚠️  Stores with invalid coordinate ranges:');
      invalidCoords.forEach(store => {
        console.log(`  - ${store.name}: (${store.latitude}, ${store.longitude})`);
      });
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`  Total stores: ${allStores.length}`);
    console.log(`  With coordinates: ${storesWithCoords.length} (${((storesWithCoords.length / allStores.length) * 100).toFixed(1)}%)`);
    console.log(`  Without coordinates: ${storesWithoutCoords.length} (${((storesWithoutCoords.length / allStores.length) * 100).toFixed(1)}%)`);
    console.log(`  Invalid ranges: ${invalidCoords.length}`);

    // Recent uploads check
    const recentStores = allStores.filter(s => {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      return s.createdAt > hourAgo;
    });

    if (recentStores.length > 0) {
      console.log(`\n🕐 Stores created in last hour: ${recentStores.length}`);
      const recentWithCoords = recentStores.filter(s => s.latitude !== null && s.longitude !== null);
      console.log(`  With coordinates: ${recentWithCoords.length}/${recentStores.length}`);
    }

  } catch (error) {
    console.error('❌ Error verifying coordinates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyStoreCoordinates()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
