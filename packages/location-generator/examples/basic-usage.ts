import { LocationGeneratorAPI } from '../src/api/LocationGeneratorAPI';
import { GenerationRequest } from '../src/types/config';
import { AnchorType } from '../src/types/core';
import { DEFAULT_WEIGHTS } from '../src/config/constants';

/**
 * Basic usage example for the National Store Location Generator
 */
async function basicUsageExample() {
  // Initialize the API
  const api = new LocationGeneratorAPI();

  // Create a sample generation request for Germany
  const request: GenerationRequest = {
    country: {
      countryCode: 'DE',
      boundary: {
        type: 'Polygon',
        coordinates: [[[13.0, 52.3], [13.8, 52.3], [13.8, 52.7], [13.0, 52.7], [13.0, 52.3]]]
      },
      administrativeRegions: [
        {
          id: 'BE',
          name: 'Berlin',
          boundary: {
            type: 'Polygon',
            coordinates: [[[13.0, 52.3], [13.8, 52.3], [13.8, 52.7], [13.0, 52.7], [13.0, 52.3]]]
          },
          population: 3700000
        }
      ],
      majorMetropolitanAreas: ['Berlin'],
      maxRegionShare: 0.4
    },
    existingStores: [
      {
        id: 'store1',
        name: 'Berlin Central',
        lat: 52.5,
        lng: 13.4,
        turnover: 500000
      }
    ],
    competitors: [
      { lat: 52.51, lng: 13.41 },
      { lat: 52.52, lng: 13.42 }
    ],
    populationData: {
      cells: [
        { lat: 52.5, lng: 13.4, population: 50000 },
        { lat: 52.51, lng: 13.41, population: 30000 },
        { lat: 52.52, lng: 13.42, population: 40000 }
      ],
      resolution: 8,
      dataSource: 'census-2023'
    },
    anchors: [
      {
        id: 'mall1',
        lat: 52.5,
        lng: 13.4,
        type: AnchorType.MALL_TENANT,
        name: 'Berlin Mall'
      },
      {
        id: 'station1',
        lat: 52.51,
        lng: 13.41,
        type: AnchorType.STATION_SHOPS,
        name: 'Central Station'
      }
    ],
    config: {
      targetK: 10,
      minSpacingM: 800,
      gridResolution: 8,
      weights: DEFAULT_WEIGHTS,
      enableAI: false,
      mode: 'Balanced'
    }
  };

  try {
    console.log('🚀 Starting location generation...');
    
    // Check system health
    const health = await api.getHealthStatus();
    console.log('📊 System Health:', health.status);

    // Get system capabilities
    const capabilities = await api.getCapabilities();
    console.log('⚙️ System Capabilities:', capabilities);

    // Generate locations
    const result = await api.generateLocations(request);

    console.log('✅ Location generation completed!');
    console.log(`📍 Generated ${result.sites.length} location recommendations`);
    console.log(`📈 Portfolio Summary:`, result.portfolio);
    console.log(`🔍 Diagnostics:`, result.diagnostics);
    console.log(`🔄 Reproducibility:`, result.reproducibility);

    // Display top 3 locations
    console.log('\n🏆 Top 3 Recommended Locations:');
    result.sites
      .sort((a, b) => b.scores.final - a.scores.final)
      .slice(0, 3)
      .forEach((site, index) => {
        console.log(`${index + 1}. ${site.id}`);
        console.log(`   📍 Location: ${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}`);
        console.log(`   ⭐ Score: ${site.scores.final.toFixed(3)}`);
        console.log(`   👥 Population: ${site.features.population.toLocaleString()}`);
        console.log(`   📏 Nearest Brand: ${site.features.nearestBrandKm.toFixed(1)}km`);
        console.log(`   🏪 Anchors: ${site.features.anchors.deduplicated}`);
        console.log(`   ✅ Status: ${site.status}`);
        console.log('');
      });

  } catch (error) {
    console.error('❌ Location generation failed:', error);
  }
}

// Export for use in other examples
export { basicUsageExample };

// Run if called directly
if (require.main === module) {
  basicUsageExample().catch(console.error);
}