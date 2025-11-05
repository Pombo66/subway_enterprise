import { PrismaClient } from "@prisma/client";

// Use PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function clearStores() {
  console.log("🗑️  Clearing store data from PostgreSQL...");
  console.log(`📡 Using database: ${DATABASE_URL}\n`);

  try {
    // Delete in order to respect foreign key constraints
    
    // 1. Delete trade areas (references stores)
    const tradeAreasDeleted = await prisma.tradeArea.deleteMany({});
    console.log(`✅ Deleted ${tradeAreasDeleted.count} trade areas`);

    // 2. Delete orders (references stores)
    const ordersDeleted = await prisma.order.deleteMany({});
    console.log(`✅ Deleted ${ordersDeleted.count} orders`);

    // 3. Delete menu items (references stores)
    const menuItemsDeleted = await prisma.menuItem.deleteMany({});
    console.log(`✅ Deleted ${menuItemsDeleted.count} menu items`);

    // 4. Finally delete stores
    const storesDeleted = await prisma.store.deleteMany({});
    console.log(`✅ Deleted ${storesDeleted.count} stores`);

    console.log("\n🎉 All store data cleared from PostgreSQL successfully!");
    console.log("📤 You can now upload fresh live data.");

  } catch (error) {
    console.error("❌ Error clearing store data:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearStores();
