import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkStores() {
  try {
    const count = await prisma.store.count();
    console.log(`📊 Current store count: ${count}`);
    
    if (count > 0) {
      const stores = await prisma.store.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          region: true
        }
      });
      console.log('\n📍 Stores in database:');
      stores.forEach(store => {
        console.log(`  - ${store.name} (${store.city}, ${store.country}) [${store.region}]`);
      });
    } else {
      console.log('✅ Database is empty - ready for fresh data!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStores();
