import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// City coordinates mapping
const CITY_COORDINATES = {
  "New York": { lat: 40.7128, lng: -74.0060 },
  "London": { lat: 51.5074, lng: -0.1278 },
  "Toronto": { lat: 43.6532, lng: -79.3832 },
  "Sydney": { lat: -33.8688, lng: 151.2093 },
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Singapore": { lat: 1.3521, lng: 103.8198 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Paris": { lat: 48.8566, lng: 2.3522 }
};

// Generate small random offset around city center
function generateOffset(baseLat, baseLng, maxOffsetKm = 15) {
  const latOffset = (Math.random() - 0.5) * 2 * (maxOffsetKm / 111);
  const lngOffset = (Math.random() - 0.5) * 2 * (maxOffsetKm / (111 * Math.cos(baseLat * Math.PI / 180)));
  
  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset
  };
}

async function updateStoreCoordinates() {
  console.log("🗺️ Updating store coordinates...\n");

  try {
    // Get all stores
    const stores = await prisma.store.findMany();
    
    for (const store of stores) {
      if (store.city && CITY_COORDINATES[store.city]) {
        const baseCoords = CITY_COORDINATES[store.city];
        const offset = generateOffset(baseCoords.lat, baseCoords.lng, 15);
        
        const updated = await prisma.store.update({
          where: { id: store.id },
          data: {
            latitude: offset.lat,
            longitude: offset.lng
          }
        });
        
        console.log(`✅ ${store.name} (${store.city}): ${offset.lat.toFixed(4)}, ${offset.lng.toFixed(4)}`);
        console.log(`   Updated record:`, updated.latitude, updated.longitude);
      } else {
        console.log(`⚠️ ${store.name}: No coordinates available for city "${store.city}"`);
      }
    }
    
    console.log(`\n🎉 Updated coordinates for ${stores.length} stores!`);
    
  } catch (error) {
    console.error("❌ Error updating coordinates:", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateStoreCoordinates();