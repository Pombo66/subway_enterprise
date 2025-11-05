import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ScenarioManagementService } from '../../../../lib/services/scenario-management.service';
import { getAuthContext, hasExpansionAccess } from '../../../../lib/middleware/auth';

const prisma = new PrismaClient();

// POST /api/expansion/scenarios - Save a new scenario
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!body.label || !body.suggestions || !Array.isArray(body.suggestions)) {
      return NextResponse.json(
        { error: 'Missing required fields: label, suggestions' },
        { status: 400 }
      );
    }

    const service = new ScenarioManagementService(prisma);
    const result = await service.saveScenario({
      label: body.label,
      regionFilter: body.regionFilter || {},
      aggressionLevel: body.aggressionLevel || 50,
      populationBias: body.populationBias || 0.5,
      proximityBias: body.proximityBias || 0.3,
      turnoverBias: body.turnoverBias || 0.2,
      minDistanceM: body.minDistanceM || 800,
      seed: body.seed || Date.now(),
      suggestions: body.suggestions,
      createdBy: authContext.userId
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Save scenario error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// GET /api/expansion/scenarios - List scenarios
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const region = searchParams.get('region') || undefined;

    const service = new ScenarioManagementService(prisma);
    const result = await service.listScenarios(
      { region, createdBy: authContext.userId },
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('List scenarios error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
