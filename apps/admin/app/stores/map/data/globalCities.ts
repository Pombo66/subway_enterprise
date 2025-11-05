/**
 * Global city coordinate database for realistic store distribution
 * Contains major metropolitan areas across North America, Europe, and Asia Pacific
 */

export interface CityData {
  name: string;
  lat: number;
  lng: number;
  country: string;
  weight: number; // Probability weight for store placement (0-1)
  population?: number; // Optional population data for reference
}

export interface RegionData {
  name: string;
  code: 'AMER' | 'EMEA' | 'APAC';
  centerLat: number;
  centerLng: number;
  cities: CityData[];
}

export const GLOBAL_CITIES: RegionData[] = [
  {
    name: 'North America',
    code: 'AMER',
    centerLat: 39.8283,
    centerLng: -98.5795,
    cities: [
      // United States - Major Cities
      { name: 'New York', lat: 40.7128, lng: -74.0060, country: 'United States', weight: 0.15, population: 8400000 },
      { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, country: 'United States', weight: 0.12, population: 3900000 },
      { name: 'Chicago', lat: 41.8781, lng: -87.6298, country: 'United States', weight: 0.10, population: 2700000 },
      { name: 'Houston', lat: 29.7604, lng: -95.3698, country: 'United States', weight: 0.08, population: 2300000 },
      { name: 'Phoenix', lat: 33.4484, lng: -112.0740, country: 'United States', weight: 0.06, population: 1600000 },
      { name: 'Philadelphia', lat: 39.9526, lng: -75.1652, country: 'United States', weight: 0.06, population: 1500000 },
      { name: 'San Antonio', lat: 29.4241, lng: -98.4936, country: 'United States', weight: 0.05, population: 1500000 },
      { name: 'San Diego', lat: 32.7157, lng: -117.1611, country: 'United States', weight: 0.05, population: 1400000 },
      { name: 'Dallas', lat: 32.7767, lng: -96.7970, country: 'United States', weight: 0.05, population: 1300000 },
      { name: 'San Jose', lat: 37.3382, lng: -121.8863, country: 'United States', weight: 0.04, population: 1000000 },
      { name: 'Austin', lat: 30.2672, lng: -97.7431, country: 'United States', weight: 0.04, population: 950000 },
      { name: 'Jacksonville', lat: 30.3322, lng: -81.6557, country: 'United States', weight: 0.03, population: 900000 },
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194, country: 'United States', weight: 0.04, population: 870000 },
      { name: 'Columbus', lat: 39.9612, lng: -82.9988, country: 'United States', weight: 0.03, population: 880000 },
      { name: 'Charlotte', lat: 35.2271, lng: -80.8431, country: 'United States', weight: 0.03, population: 870000 },
      { name: 'Fort Worth', lat: 32.7555, lng: -97.3308, country: 'United States', weight: 0.03, population: 870000 },
      { name: 'Indianapolis', lat: 39.7684, lng: -86.1581, country: 'United States', weight: 0.03, population: 860000 },
      { name: 'Seattle', lat: 47.6062, lng: -122.3321, country: 'United States', weight: 0.04, population: 750000 },
      { name: 'Denver', lat: 39.7392, lng: -104.9903, country: 'United States', weight: 0.04, population: 710000 },
      { name: 'Boston', lat: 42.3601, lng: -71.0589, country: 'United States', weight: 0.04, population: 690000 },
      
      // Canada - Major Cities
      { name: 'Toronto', lat: 43.6532, lng: -79.3832, country: 'Canada', weight: 0.08, population: 2930000 },
      { name: 'Montreal', lat: 45.5017, lng: -73.5673, country: 'Canada', weight: 0.06, population: 1780000 },
      { name: 'Vancouver', lat: 49.2827, lng: -123.1207, country: 'Canada', weight: 0.05, population: 675000 },
      { name: 'Calgary', lat: 51.0447, lng: -114.0719, country: 'Canada', weight: 0.04, population: 1340000 },
      { name: 'Edmonton', lat: 53.5461, lng: -113.4938, country: 'Canada', weight: 0.03, population: 980000 },
      { name: 'Ottawa', lat: 45.4215, lng: -75.6972, country: 'Canada', weight: 0.03, population: 990000 },
      { name: 'Winnipeg', lat: 49.8951, lng: -97.1384, country: 'Canada', weight: 0.02, population: 750000 },
      
      // Mexico - Major Cities
      { name: 'Mexico City', lat: 19.4326, lng: -99.1332, country: 'Mexico', weight: 0.06, population: 9200000 },
      { name: 'Guadalajara', lat: 20.6597, lng: -103.3496, country: 'Mexico', weight: 0.03, population: 1560000 },
      { name: 'Monterrey', lat: 25.6866, lng: -100.3161, country: 'Mexico', weight: 0.03, population: 1140000 },
    ]
  },
  
  {
    name: 'Europe, Middle East & Africa',
    code: 'EMEA',
    centerLat: 54.5260,
    centerLng: 15.2551,
    cities: [
      // United Kingdom
      { name: 'London', lat: 51.5074, lng: -0.1278, country: 'United Kingdom', weight: 0.15, population: 9000000 },
      { name: 'Birmingham', lat: 52.4862, lng: -1.8904, country: 'United Kingdom', weight: 0.04, population: 1140000 },
      { name: 'Manchester', lat: 53.4808, lng: -2.2426, country: 'United Kingdom', weight: 0.04, population: 550000 },
      { name: 'Glasgow', lat: 55.8642, lng: -4.2518, country: 'United Kingdom', weight: 0.03, population: 630000 },
      { name: 'Liverpool', lat: 53.4084, lng: -2.9916, country: 'United Kingdom', weight: 0.03, population: 500000 },
      
      // France
      { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'France', weight: 0.12, population: 2160000 },
      { name: 'Marseille', lat: 43.2965, lng: 5.3698, country: 'France', weight: 0.04, population: 870000 },
      { name: 'Lyon', lat: 45.7640, lng: 4.8357, country: 'France', weight: 0.04, population: 520000 },
      { name: 'Toulouse', lat: 43.6047, lng: 1.4442, country: 'France', weight: 0.03, population: 480000 },
      
      // Germany
      { name: 'Berlin', lat: 52.5200, lng: 13.4050, country: 'Germany', weight: 0.10, population: 3670000 },
      { name: 'Hamburg', lat: 53.5511, lng: 9.9937, country: 'Germany', weight: 0.05, population: 1900000 },
      { name: 'Munich', lat: 48.1351, lng: 11.5820, country: 'Germany', weight: 0.05, population: 1470000 },
      { name: 'Cologne', lat: 50.9375, lng: 6.9603, country: 'Germany', weight: 0.04, population: 1080000 },
      { name: 'Frankfurt', lat: 50.1109, lng: 8.6821, country: 'Germany', weight: 0.04, population: 750000 },
      
      // Italy
      { name: 'Rome', lat: 41.9028, lng: 12.4964, country: 'Italy', weight: 0.08, population: 2870000 },
      { name: 'Milan', lat: 45.4642, lng: 9.1900, country: 'Italy', weight: 0.06, population: 1400000 },
      { name: 'Naples', lat: 40.8518, lng: 14.2681, country: 'Italy', weight: 0.04, population: 970000 },
      
      // Spain
      { name: 'Madrid', lat: 40.4168, lng: -3.7038, country: 'Spain', weight: 0.08, population: 3220000 },
      { name: 'Barcelona', lat: 41.3851, lng: 2.1734, country: 'Spain', weight: 0.06, population: 1620000 },
      { name: 'Valencia', lat: 39.4699, lng: -0.3763, country: 'Spain', weight: 0.03, population: 790000 },
      
      // Netherlands
      { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, country: 'Netherlands', weight: 0.05, population: 870000 },
      { name: 'Rotterdam', lat: 51.9244, lng: 4.4777, country: 'Netherlands', weight: 0.03, population: 650000 },
      
      // Other European Cities
      { name: 'Brussels', lat: 50.8503, lng: 4.3517, country: 'Belgium', weight: 0.03, population: 1200000 },
      { name: 'Vienna', lat: 48.2082, lng: 16.3738, country: 'Austria', weight: 0.04, population: 1900000 },
      { name: 'Zurich', lat: 47.3769, lng: 8.5417, country: 'Switzerland', weight: 0.03, population: 420000 },
      { name: 'Stockholm', lat: 59.3293, lng: 18.0686, country: 'Sweden', weight: 0.03, population: 980000 },
      { name: 'Copenhagen', lat: 55.6761, lng: 12.5683, country: 'Denmark', weight: 0.03, population: 640000 },
      { name: 'Oslo', lat: 59.9139, lng: 10.7522, country: 'Norway', weight: 0.03, population: 690000 },
      { name: 'Helsinki', lat: 60.1699, lng: 24.9384, country: 'Finland', weight: 0.02, population: 660000 },
      
      // Eastern Europe
      { name: 'Warsaw', lat: 52.2297, lng: 21.0122, country: 'Poland', weight: 0.04, population: 1790000 },
      { name: 'Prague', lat: 50.0755, lng: 14.4378, country: 'Czech Republic', weight: 0.04, population: 1320000 },
      { name: 'Budapest', lat: 47.4979, lng: 19.0402, country: 'Hungary', weight: 0.04, population: 1750000 },
      
      // Middle East & Africa
      { name: 'Dubai', lat: 25.2048, lng: 55.2708, country: 'United Arab Emirates', weight: 0.05, population: 3400000 },
      { name: 'Istanbul', lat: 41.0082, lng: 28.9784, country: 'Turkey', weight: 0.06, population: 15460000 },
      { name: 'Tel Aviv', lat: 32.0853, lng: 34.7818, country: 'Israel', weight: 0.03, population: 460000 },
      { name: 'Cairo', lat: 30.0444, lng: 31.2357, country: 'Egypt', weight: 0.04, population: 10000000 },
      { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, country: 'South Africa', weight: 0.04, population: 4400000 },
      { name: 'Cape Town', lat: -33.9249, lng: 18.4241, country: 'South Africa', weight: 0.03, population: 4600000 },
    ]
  },
  
  {
    name: 'Asia Pacific',
    code: 'APAC',
    centerLat: 35.6762,
    centerLng: 139.6503,
    cities: [
      // Japan
      { name: 'Tokyo', lat: 35.6762, lng: 139.6503, country: 'Japan', weight: 0.15, population: 37400000 },
      { name: 'Osaka', lat: 34.6937, lng: 135.5023, country: 'Japan', weight: 0.08, population: 19300000 },
      { name: 'Nagoya', lat: 35.1815, lng: 136.9066, country: 'Japan', weight: 0.04, population: 10400000 },
      { name: 'Sapporo', lat: 43.0642, lng: 141.3469, country: 'Japan', weight: 0.03, population: 2700000 },
      { name: 'Fukuoka', lat: 33.5904, lng: 130.4017, country: 'Japan', weight: 0.03, population: 2600000 },
      
      // China
      { name: 'Shanghai', lat: 31.2304, lng: 121.4737, country: 'China', weight: 0.12, population: 28000000 },
      { name: 'Beijing', lat: 39.9042, lng: 116.4074, country: 'China', weight: 0.10, population: 21500000 },
      { name: 'Guangzhou', lat: 23.1291, lng: 113.2644, country: 'China', weight: 0.08, population: 15300000 },
      { name: 'Shenzhen', lat: 22.5431, lng: 114.0579, country: 'China', weight: 0.06, population: 17500000 },
      { name: 'Chengdu', lat: 30.5728, lng: 104.0668, country: 'China', weight: 0.05, population: 20900000 },
      
      // South Korea
      { name: 'Seoul', lat: 37.5665, lng: 126.9780, country: 'South Korea', weight: 0.08, population: 9700000 },
      { name: 'Busan', lat: 35.1796, lng: 129.0756, country: 'South Korea', weight: 0.04, population: 3400000 },
      
      // Southeast Asia
      { name: 'Singapore', lat: 1.3521, lng: 103.8198, country: 'Singapore', weight: 0.06, population: 5900000 },
      { name: 'Bangkok', lat: 13.7563, lng: 100.5018, country: 'Thailand', weight: 0.06, population: 10500000 },
      { name: 'Jakarta', lat: -6.2088, lng: 106.8456, country: 'Indonesia', weight: 0.06, population: 10600000 },
      { name: 'Manila', lat: 14.5995, lng: 120.9842, country: 'Philippines', weight: 0.05, population: 13500000 },
      { name: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869, country: 'Malaysia', weight: 0.04, population: 8000000 },
      { name: 'Ho Chi Minh City', lat: 10.8231, lng: 106.6297, country: 'Vietnam', weight: 0.04, population: 9000000 },
      
      // India
      { name: 'Mumbai', lat: 19.0760, lng: 72.8777, country: 'India', weight: 0.08, population: 20400000 },
      { name: 'Delhi', lat: 28.7041, lng: 77.1025, country: 'India', weight: 0.08, population: 32900000 },
      { name: 'Bangalore', lat: 12.9716, lng: 77.5946, country: 'India', weight: 0.06, population: 13200000 },
      { name: 'Hyderabad', lat: 17.3850, lng: 78.4867, country: 'India', weight: 0.04, population: 10000000 },
      { name: 'Chennai', lat: 13.0827, lng: 80.2707, country: 'India', weight: 0.04, population: 11000000 },
      
      // Australia & New Zealand
      { name: 'Sydney', lat: -33.8688, lng: 151.2093, country: 'Australia', weight: 0.08, population: 5300000 },
      { name: 'Melbourne', lat: -37.8136, lng: 144.9631, country: 'Australia', weight: 0.06, population: 5100000 },
      { name: 'Brisbane', lat: -27.4698, lng: 153.0251, country: 'Australia', weight: 0.04, population: 2600000 },
      { name: 'Perth', lat: -31.9505, lng: 115.8605, country: 'Australia', weight: 0.03, population: 2100000 },
      { name: 'Adelaide', lat: -34.9285, lng: 138.6007, country: 'Australia', weight: 0.02, population: 1400000 },
      { name: 'Auckland', lat: -36.8485, lng: 174.7633, country: 'New Zealand', weight: 0.03, population: 1700000 },
      { name: 'Wellington', lat: -41.2865, lng: 174.7762, country: 'New Zealand', weight: 0.02, population: 420000 },
    ]
  }
];

/**
 * Get all cities from all regions
 */
export function getAllCities(): CityData[] {
  return GLOBAL_CITIES.flatMap(region => region.cities);
}

/**
 * Get cities for a specific region
 */
export function getCitiesForRegion(regionCode: 'AMER' | 'EMEA' | 'APAC'): CityData[] {
  const region = GLOBAL_CITIES.find(r => r.code === regionCode);
  return region ? region.cities : [];
}

/**
 * Get a random city based on population weights
 */
export function getRandomWeightedCity(cities: CityData[]): CityData {
  const totalWeight = cities.reduce((sum, city) => sum + city.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const city of cities) {
    random -= city.weight;
    if (random <= 0) {
      return city;
    }
  }
  
  // Fallback to first city if something goes wrong
  return cities[0];
}

/**
 * Find the nearest city to given coordinates
 */
export function findNearestCity(lat: number, lng: number, cities: CityData[] = getAllCities()): CityData {
  let nearestCity = cities[0];
  let minDistance = calculateDistance(lat, lng, nearestCity.lat, nearestCity.lng);
  
  for (const city of cities.slice(1)) {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }
  
  return nearestCity;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Generate a small random offset around a city center for store placement
 */
export function generateCityOffset(baseLat: number, baseLng: number, maxOffsetKm: number = 25): {
  lat: number;
  lng: number;
} {
  // Convert km to degrees (approximate)
  const latOffset = (Math.random() - 0.5) * 2 * (maxOffsetKm / 111); // 1 degree lat ≈ 111 km
  const lngOffset = (Math.random() - 0.5) * 2 * (maxOffsetKm / (111 * Math.cos(baseLat * Math.PI / 180)));
  
  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset
  };
}