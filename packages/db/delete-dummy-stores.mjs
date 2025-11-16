import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const dummyStoreNames = [
  "Central Station",
  "Riverside", 
  "Downtown Plaza",
  "Mall Central",
  "City Center",
  "Harbor View",
  "Airport Terminal",
  "Shopping District"
];

async function deleteDummyStores() {
  console.log('🗑️  Deleting dummy stores...\n');

  try {
    const result = await prisma.store.deleteMany({
      where: {
        name: {
          in: dummyStoreNames
        }
      }
    });

    console.log(`✅ Deleted ${result.count} dummy stores`);

    const remaining = await prisma.store.count();
    console.log(`📊 Remaining stores: ${remaining}`);

  } catch (error) {
    console.error('❌ Failed to delete dummy stores:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDummyStores();
