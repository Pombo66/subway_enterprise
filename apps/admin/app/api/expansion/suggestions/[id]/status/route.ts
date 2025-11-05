import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ScenarioManagementService } from '../../../../../../lib/services/scenario-management.service';
import { getAuthContext, hasExpansionAccess } from '../../../../../../lib/middleware/auth';

const prisma = new PrismaClient();

// PATCH /api/expansion/suggestions/:id/status - Update suggestion status
export async function PATCH(
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

    // Validate status
    const validStatuses = ['NEW', 'APPROVED', 'REJECTED', 'HOLD'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: NEW, APPROVED, REJECTED, HOLD' },
        { status: 400 }
      );
    }

    const service = new ScenarioManagementService(prisma);
    await service.updateSuggestionStatus(params.id, body.status);

    // Fetch updated suggestion
    const suggestion = await prisma.expansionSuggestion.findUnique({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true, suggestion });
  } catch (error: any) {
    console.error('Update suggestion status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
