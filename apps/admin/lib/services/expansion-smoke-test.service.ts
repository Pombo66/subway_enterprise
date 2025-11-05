import { PrismaClient } from '@prisma/client';
import { MapboxTilequeryService } from './mapbox-tilequery.service';
import { GermanyLandMaskService } from './germany-land-mask.service';
import { EnhancedSnappingService } from './enhanced-snapping.service';

export interface SmokeTestResult {
  success: boolean;
  location: string;
  lat: number;
  lng: number;
  featuresFound: number;
  accepted: boolean;
  reason?: string;
  snapResult?: any;
}

export class ExpansionSmokeTestService {
  private mapboxService: MapboxTilequeryService;
  private landMaskService: GermanyLandMaskService;
  private snappingService: EnhancedSnappingService;

  // Known urban coordinates in Germany
  private readonly TEST_LOCATIONS = [
    { name: 'Berlin (Brandenburg Gate)', lat: 52.516275, lng: 13.377704 },
    { name: 'Hamburg (City Center)', lat: 53.5511, lng: 9.9937 },
    { name: 'Munich (Marienplatz)', lat: 48.1374, lng: 11.5755 }
  ];

  constructor(private readonly prisma: PrismaClient) {
    this.mapboxService = new MapboxTilequeryService(prisma);
    this.landMaskService = new GermanyLandMaskService(prisma);
    this.snappingService = new EnhancedSnappingService(prisma);
  }

  /**
   * Run comprehensive smoke test before expansion generation
   */
  async runSmokeTest(): Promise<{ success: boolean; results: SmokeTestResult[]; summary: string }> {
    console.log('🧪 Running expansion generation smoke test...');
    console.log('   Testing 3 known urban locations in Germany\n');

    const results: SmokeTestResult[] = [];
    let passCount = 0;

    for (const location of this.TEST_LOCATIONS) {
      console.log(`📍 Testing: ${location.name}`);
      
      try {
        // Step 1: Land mask validation
        const landResult = await this.landMaskService.validatePoint(location.lat, location.lng);
        if (!landResult.isOnLand || !landResult.isInCountry) {
          results.push({
            success: false,
            location: location.name,
            lat: location.lat,
            lng: location.lng,
            featuresFound: 0,
            accepted: false,
            reason: 'Failed land mask validation'
          });
          console.log(`   ❌ Failed land mask validation`);
          continue;
        }

        // Step 2: Adaptive Tilequery
        const tilequeryResult = await this.mapboxService.validateLocationAdaptive(location.lat, location.lng);
        
        if (tilequeryResult.features.length === 0) {
          results.push({
            success: false,
            location: location.name,
            lat: location.lat,
            lng: location.lng,
            featuresFound: 0,
            accepted: false,
            reason: 'No Tilequery features found'
          });
          console.log(`   ❌ No features found`);
          continue;
        }

        // Step 3: Snapping validation
        const snapResult = await this.snappingService.snapToNearestInfrastructure(
          location.lat, 
          location.lng, 
          tilequeryResult.features
        );

        const snapValidation = this.snappingService.validateSnappedLocation(
          snapResult, 
          tilequeryResult.features
        );

        // Step 4: Final country validation after snapping
        let finalAccepted = snapValidation.isValid;
        if (finalAccepted && snapResult.success) {
          const countryCheck = await this.landMaskService.validateSnappedPoint(
            location.lat, location.lng,
            snapResult.snappedLat, snapResult.snappedLng
          );
          finalAccepted = countryCheck;
        }

        const testResult: SmokeTestResult = {
          success: finalAccepted,
          location: location.name,
          lat: location.lat,
          lng: location.lng,
          featuresFound: tilequeryResult.features.length,
          accepted: finalAccepted,
          reason: finalAccepted ? undefined : (snapValidation.reason || 'Unknown rejection'),
          snapResult: snapResult
        };

        results.push(testResult);

        if (finalAccepted) {
          passCount++;
          console.log(`   ✅ PASSED: ${tilequeryResult.features.length} features, snapped to ${snapResult.snapType} (${Math.round(snapResult.snapDistanceM)}m)`);
        } else {
          console.log(`   ❌ FAILED: ${testResult.reason}`);
        }

      } catch (error) {
        results.push({
          success: false,
          location: location.name,
          lat: location.lat,
          lng: location.lng,
          featuresFound: 0,
          accepted: false,
          reason: `Error: ${error.message}`
        });
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }

    const overallSuccess = passCount === this.TEST_LOCATIONS.length;
    const summary = `${passCount}/${this.TEST_LOCATIONS.length} locations passed`;

    console.log(`\n🎯 Smoke test ${overallSuccess ? 'PASSED' : 'FAILED'}: ${summary}`);
    
    if (!overallSuccess) {
      console.log('⚠️  CRITICAL: Smoke test failures indicate configuration issues');
      console.log('   Expansion generation may have low acceptance rates');
      console.log('   Check Mapbox token, land mask, and validation logic');
    }

    return {
      success: overallSuccess,
      results,
      summary
    };
  }

  /**
   * Quick validation test for a single coordinate
   */
  async testSingleLocation(lat: number, lng: number, name?: string): Promise<SmokeTestResult> {
    const locationName = name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    try {
      // Land mask check
      const landResult = await this.landMaskService.validatePoint(lat, lng);
      if (!landResult.isOnLand || !landResult.isInCountry) {
        return {
          success: false,
          location: locationName,
          lat, lng,
          featuresFound: 0,
          accepted: false,
          reason: 'Outside Germany or too close to coast'
        };
      }

      // Tilequery check
      const tilequeryResult = await this.mapboxService.validateLocationAdaptive(lat, lng);
      
      if (tilequeryResult.features.length === 0) {
        return {
          success: false,
          location: locationName,
          lat, lng,
          featuresFound: 0,
          accepted: false,
          reason: 'No features found in Tilequery'
        };
      }

      // Snapping check
      const snapResult = await this.snappingService.snapToNearestInfrastructure(lat, lng, tilequeryResult.features);
      const snapValidation = this.snappingService.validateSnappedLocation(snapResult, tilequeryResult.features);

      return {
        success: snapValidation.isValid,
        location: locationName,
        lat, lng,
        featuresFound: tilequeryResult.features.length,
        accepted: snapValidation.isValid,
        reason: snapValidation.reason,
        snapResult
      };

    } catch (error) {
      return {
        success: false,
        location: locationName,
        lat, lng,
        featuresFound: 0,
        accepted: false,
        reason: `Error: ${error.message}`
      };
    }
  }
}