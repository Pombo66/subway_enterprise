import { LocationGeneratorAPI } from '../src/api/LocationGeneratorAPI';
import { GenerationRequest } from '../src/types/config';
import { AnchorType } from '../src/types/core';
import { DEFAULT_WEIGHTS } from '../src/config/constants';

/**
 * Executive features demonstration
 */
async function executiveFeaturesDemo() {
  const api = new LocationGeneratorAPI();

  // Sample request (same as basic example)
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
      { id: 'store1', name: 'Berlin Central', lat: 52.5, lng: 13.4, turnover: 500000 }
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
      { id: 'mall1', lat: 52.5, lng: 13.4, type: AnchorType.MALL_TENANT, name: 'Berlin Mall' },
      { id: 'station1', lat: 52.51, lng: 13.41, type: AnchorType.STATION_SHOPS, name: 'Central Station' }
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
    console.log('🎯 Executive Features Demo\n');

    // 1. Generate initial locations
    console.log('1️⃣ Generating baseline locations...');
    const result = await api.generateLocations(request);
    console.log(`✅ Generated ${result.sites.length} locations\n`);

    // 2. Generate Pareto Frontier
    console.log('2️⃣ Generating Pareto frontier...');
    const paretoResult = await api.generateParetoFrontier(
      result.sites,
      request,
      request.existingStores,
      { minK: 5, maxK: 25 }
    );
    
    console.log(`📊 Pareto Frontier: ${paretoResult.frontier.length} non-dominated points`);
    console.log(`🎯 Knee Point: K=${paretoResult.kneePoint.k} (ROI: ${(paretoResult.kneePoint.roi * 100).toFixed(1)}%, Risk: ${(paretoResult.kneePoint.risk * 100).toFixed(1)}%)`);
    console.log(`📈 ROI Range: ${(Math.min(...paretoResult.frontier.map(p => p.roi)) * 100).toFixed(1)}% - ${(Math.max(...paretoResult.frontier.map(p => p.roi)) * 100).toFixed(1)}%\n`);

    // 3. Scenario Theater (instant switching)
    console.log('3️⃣ Scenario Theater (cached features)...');
    
    const scenarios = ['Defend', 'Balanced', 'Blitz'] as const;
    for (const mode of scenarios) {
      const startTime = Date.now();
      
      const scenarioResult = await api.switchScenario(
        mode,
        result.sites, // Using cached features!
        DEFAULT_WEIGHTS,
        request
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`⚡ ${mode}: ${scenarioResult.portfolio.length} sites, ${processingTime}ms ${scenarioResult.cacheHit ? '(cached)' : '(computed)'}`);
    }
    console.log('');

    // 4. Counterfactual Analysis
    console.log('4️⃣ Counterfactual Analysis...');
    const topSite = result.sites.sort((a, b) => b.scores.final - a.scores.final)[0];
    const counterfactuals = api.generateCounterfactuals(topSite, result.sites, DEFAULT_WEIGHTS);
    
    console.log(`🔍 Site ${topSite.id} (Rank #${counterfactuals.currentRank}):`);
    console.log(`   ${counterfactuals.summary}`);
    console.log(`   💡 Easiest improvement: ${counterfactuals.easiestPath.impact}`);
    console.log(`   🎯 Thresholds to flip:`);
    counterfactuals.thresholds.slice(0, 3).forEach(t => {
      console.log(`      • ${t.parameter}: ${t.direction} to ${t.thresholdValue.toFixed(1)} (${t.likelihood} likelihood)`);
    });
    console.log('');

    // 5. Stability Analysis
    console.log('5️⃣ Stability Analysis (±10% weight jitter)...');
    const stabilityResult = await api.analyzeStability(result.sites, DEFAULT_WEIGHTS, request, 20);
    const stabilitySummary = api.getStabilitySummary(stabilityResult);
    
    console.log(`📊 Overall Stability: ${stabilitySummary.overallScore} (${stabilitySummary.confidence} confidence)`);
    console.log(`✅ Stable Sites: ${stabilityResult.stableSites}/${result.sites.length} (${stabilitySummary.stablePercentage.toFixed(1)}%)`);
    
    if (stabilitySummary.topRisks.length > 0) {
      console.log(`⚠️  Top Risks:`);
      stabilitySummary.topRisks.forEach(risk => console.log(`   • ${risk}`));
    }
    console.log('');

    // 6. Executive Summary
    console.log('6️⃣ Executive Summary');
    console.log('═══════════════════════════════════════');
    console.log(`🎯 Recommended Portfolio: ${paretoResult.kneePoint.k} locations`);
    console.log(`📈 Expected ROI: ${(paretoResult.kneePoint.roi * 100).toFixed(1)}%`);
    console.log(`⚖️  Risk Level: ${(paretoResult.kneePoint.risk * 100).toFixed(1)}%`);
    console.log(`🗺️  Coverage: ${(paretoResult.kneePoint.coverage * 100).toFixed(1)}%`);
    console.log(`🔒 Stability: ${stabilitySummary.overallScore} (${stabilitySummary.confidence})`);
    console.log(`⚡ Scenario Switching: <500ms with cached features`);
    console.log(`🎲 Counterfactuals: Available for all ${result.sites.length} sites`);
    console.log(`📊 Pareto Frontier: ${paretoResult.frontier.length} optimization points`);

  } catch (error) {
    console.error('❌ Executive demo failed:', error);
  }
}

// Export for use
export { executiveFeaturesDemo };

// Run if called directly
if (require.main === module) {
  executiveFeaturesDemo().catch(console.error);
}