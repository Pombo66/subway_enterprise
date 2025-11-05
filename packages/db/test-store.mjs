import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testStoreCreation() {
  try {
    console.log("Testing store creation...");
    
    const store = await prisma.store.create({
      data: {
        name: "Test Store",
        country: "US",
        region: "AMER",
        city: "New York",
        latitude: 40.7128,
        longitude: -74.0060
      }
    });
    
    console.log("✅ Store created:", store);
    
    const allStores = await prisma.store.findMany();
    console.log("📍 All stores:", allStores.length);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testStoreCreation();