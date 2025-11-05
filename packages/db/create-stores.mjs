import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const storeData = [
  { name: "Central Station", country: "US", region: "AMER", city: "New York", latitude: 40.7128, longitude: -74.0060 },
  { name: "Riverside", country: "GB", region: "EMEA", city: "London", latitude: 51.5074, longitude: -0.1278 },
  { name: "Downtown Plaza", country: "CA", region: "AMER", city: "Toronto", latitude: 43.6532, longitude: -79.3832 },
  { name: "Mall Central", country: "AU", region: "APAC", city: "Sydney", latitude: -33.8688, longitude: 151.2093 },
  { name: "City Center", country: "DE", region: "EMEA", city: "Berlin", latitude: 52.5200, longitude: 13.4050 },
  { name: "Harbor View", country: "SG", region: "APAC", city: "Singapore", latitude: 1.3521, longitude: 103.8198 },
  { name: "Airport Terminal", country: "US", region: "AMER", city: "Los Angeles", latitude: 34.0522, longitude: -118.2437 },
  { name: "Shopping District", country: "FR", region: "EMEA", city: "Paris", latitude: 48.8566, longitude: 2.3522 }
];

async function createStores() {
  try {
    console.log("🏪 Creating stores with coordinates...\n");
    
    // Clear existing stores
    await prisma.store.deleteMany();
    
    // Create new stores
    for (const store of storeData) {
      const created = await prisma.store.create({
        data: store
      });
      
      console.log(`✅ ${created.name} (${created.city}): ${created.latitude}, ${created.longitude}`);
    }
    
    console.log(`\n🎉 Created ${storeData.length} stores with realistic coordinates!`);
    
    // Verify
    const count = await prisma.store.count();
    console.log(`📊 Total stores in database: ${count}`);
    
  } catch (error) {
    console.error("❌ Error creating stores:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createStores();