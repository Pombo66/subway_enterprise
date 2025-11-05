import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ScenarioManagementService } from '../../../../../../lib/services/scenario-management.service';
import { getAuthContext, hasExpansionAccess } from '../../../../../../lib/middleware/auth';

const prisma = new PrismaClient();

// POST /api/expansion/scenarios/:id/refresh - Refresh a scenario
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

    const service = new ScenarioManagementService(prisma);
    
    // First check if scenario exists and user has access
    const existing = await service.loadScenario(params.id);
    if (existing.scenario.createdBy !== authContext.userId && authContext.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Access denied' },
        { status: 403 }
      );
    }

    // Refresh the scenario
    const result = await service.refreshScenario(params.id);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.message === 'Scenario not found') {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Refresh scenario error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
