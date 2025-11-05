import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ExpansionGenerationService, GenerationParams } from '../../../../../../lib/services/expansion-generation.service';
import { getAuthContext, hasExpansionAccess } from '../../../../../../lib/middleware/auth';

const prisma = new PrismaClient();

// POST /api/expansion/scenarios/:id/expand - Progressive expansion
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasExpansionAccess(authContext.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Expansion feature access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targetCount = body.targetCount || 50;

    // Load existing scenario
    const scenario = await prisma.expansionScenario.findUnique({
      where: { id: params.id },
      include: {
        suggestions: true
      }
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    // Verify ownership
    if (scenario.createdBy !== authContext.userId && authContext.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    const currentCount = scenario.suggestions.length;

    // Check if already at or above target
    if (currentCount >= targetCount) {
      return NextResponse.json({
        message: 'Scenario already has target number of suggestions',
        currentCount,
        targetCount,
        added: 0
      });
    }

    // Generate additional suggestions using same seed and parameters
    const generationParams: GenerationParams = {
      region: JSON.parse(scenario.regionFilter),
      aggression: scenario.aggressionLevel,
      populationBias: scenario.populationBias,
      proximityBias: scenario.proximityBias,
      turnoverBias: scenario.turnoverBias,
      minDistanceM: scenario.minDistanceM,
      seed: scenario.seed,
      targetCount, // Generate up to target count
      scenarioId: scenario.id,
      enableMapboxFiltering: body.enableMapboxFiltering !== false,
      enableAIRationale: body.enableAIRationale !== false
    };

    const service = new ExpansionGenerationService(prisma);
    const result = await service.generateExpansionSuggestions(generationParams);

    // Filter out suggestions that are too close to existing ones
    const existingCoords = scenario.suggestions.map(s => ({ lat: s.lat, lng: s.lng }));
    const newSuggestions = result.suggestions.filter(newSug => {
      return !existingCoords.some(existing => {
        const latDiff = Math.abs(existing.lat - newSug.lat);
        const lngDiff = Math.abs(existing.lng - newSug.lng);
        // Consider duplicates if within ~100m (roughly 0.001 degrees)
        return latDiff < 0.001 && lngDiff < 0.001;
      });
    });

    // Limit to only the additional suggestions needed
    const needed = targetCount - currentCount;
    const toAdd = newSuggestions.slice(0, needed);

    // Add new suggestions to scenario
    if (toAdd.length > 0) {
      await prisma.expansionSuggestion.createMany({
        data: toAdd.map(s => ({
          scenarioId: scenario.id,
          lat: s.lat,
          lng: s.lng,
          confidence: s.confidence || 0.5,
          rationale: JSON.stringify(s.rationale || {}),
          rationaleText: s.rationaleText || '',
          band: s.band || 'MEDIUM',
          status: 'NEW',
          urbanDensityIndex: s.urbanDensityIndex || 0.3,
          roadDistanceM: s.roadDistanceM || 0,
          buildingDistanceM: s.buildingDistanceM || 0,
          landuseType: s.landuseType || 'unknown',
          mapboxValidated: s.mapboxValidated || false,
          aiRationaleCached: false
        }))
      });

      // Update scenario timestamp
      await prisma.expansionScenario.update({
        where: { id: scenario.id },
        data: { updatedAt: new Date() }
      });
    }

    return NextResponse.json({
      message: `Added ${toAdd.length} new suggestions`,
      currentCount,
      newCount: currentCount + toAdd.length,
      targetCount,
      added: toAdd.length,
      suggestions: toAdd
    });
  } catch (error: any) {
    console.error('Expand scenario error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
