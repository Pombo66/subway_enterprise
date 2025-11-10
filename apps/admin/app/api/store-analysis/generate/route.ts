import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// POST /api/store-analysis/generate - Start store analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.region && !body.storeIds) {
      return NextResponse.json(
        { error: 'Either region or storeIds must be provided' },
        { status: 400 }
      );
    }

    // Create idempotency key
    const idempotencyKey = body.idempotencyKey || uuidv4();
    
    // Check for existing job
    const existingJob = await prisma.storeAnalysisJob.findUnique({
      where: { idempotencyKey }
    });

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.status,
        isReused: true
      });
    }

    // Create analysis parameters
    const params = {
      region: body.region,
      storeIds: body.storeIds,
      model: body.model || 'gpt-5-mini',
      analysisType: body.analysisType || 'performance'
    };

    // Create new job
    const job = await prisma.storeAnalysisJob.create({
      data: {
        idempotencyKey,
        userId: 'system', // TODO: Get from auth
        params: JSON.stringify(params),
        status: 'queued'
      }
    });

    console.log(`🔍 Store analysis job created: ${job.id}`);
    console.log(`   Region: ${params.region || 'Custom selection'}`);
    console.log(`   Model: ${params.model}`);
    console.log(`   Store IDs: ${params.storeIds ? params.storeIds.length + ' stores' : 'All in region'}`);

    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
      isReused: false
    }, { status: 202 });

  } catch (error) {
    console.error('Store analysis generation error:', error);
    return NextResponse.json(
      { error: 'Failed to start store analysis' },
      { status: 500 }
    );
  }
}
