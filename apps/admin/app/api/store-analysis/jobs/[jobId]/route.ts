import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/store-analysis/jobs/:id - Get analysis job status
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    const job = await prisma.storeAnalysisJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Parse result if completed
    let result = null;
    if (job.status === 'completed' && job.result) {
      try {
        result = JSON.parse(job.result);
      } catch (e) {
        console.error('Failed to parse job result:', e);
      }
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      storesAnalyzed: job.storesAnalyzed,
      tokensUsed: job.tokensUsed,
      actualCost: job.actualCost,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
      result
    });

  } catch (error) {
    console.error('Job status error:', error);
    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}
