import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ExpansionJobService } from '../../../../../lib/services/expansion-job.service';
import { getAuthContext } from '../../../../../lib/middleware/auth';
import { ExpansionLogger } from '../../../../../lib/logging/expansion-logger';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Check authentication
    const authContext = await getAuthContext(request);
    if (!authContext) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get job
    const jobService = new ExpansionJobService(prisma);
    const job = await jobService.getJob(params.jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // 3. Check ownership
    if (job.userId !== authContext.userId) {
      return NextResponse.json(
        { error: 'Forbidden - Job belongs to another user' },
        { status: 403 }
      );
    }

    // 4. Return job status
    const response: any = {
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };

    // Add timing info if available
    if (job.startedAt) {
      response.startedAt = job.startedAt;
    }
    if (job.completedAt) {
      response.completedAt = job.completedAt;
      response.duration = job.completedAt.getTime() - (job.startedAt?.getTime() || job.createdAt.getTime());
    }

    // Add cost info if available
    if (job.tokenEstimate) {
      response.estimate = {
        tokens: job.tokenEstimate,
        cost: job.costEstimate
      };
    }
    if (job.tokensUsed) {
      response.actual = {
        tokens: job.tokensUsed,
        cost: job.actualCost
      };
    }

    // Add result if completed
    if (job.status === 'completed' && job.result) {
      try {
        // The job service already parses the result, so we can use it directly
        response.result = job.result;
        
        // 🔍 DIAGNOSTIC: Log result structure for uniqueness verification
        if (response.result?.suggestions && Array.isArray(response.result.suggestions)) {
          console.log(`🔍 API Response Diagnostic for job ${params.jobId}:`);
          console.log(`   Total suggestions: ${response.result.suggestions.length}`);
          
          // Check for unique rationale texts
          const rationaleTexts = response.result.suggestions.map((s: any) => s.rationaleText || 'N/A');
          const uniqueRationaleTexts = new Set(rationaleTexts);
          console.log(`   Unique rationale texts: ${uniqueRationaleTexts.size}/${rationaleTexts.length}`);
          
          if (uniqueRationaleTexts.size < rationaleTexts.length) {
            console.log('🚨 DUPLICATE CONTENT DETECTED IN API RESPONSE!');
            response.result.suggestions.forEach((s: any, index: number) => {
              console.log(`   ${index + 1}. ${s.settlementName || 'Location'}: "${(s.rationaleText || 'N/A').substring(0, 50)}..."`);
            });
          } else {
            console.log('✅ All suggestion content is unique in API response');
          }
        }
      } catch (error) {
        console.error('❌ Failed to process job result:', error);
        response.result = {
          error: 'Failed to process job result',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    // Add error if failed
    if (job.status === 'failed' && job.error) {
      response.error = job.error;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    ExpansionLogger.logDetailedError(error, {
      endpoint: `/api/expansion/jobs/${params.jobId}`,
      params: { jobId: params.jobId }
    });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to retrieve job status'
      },
      { status: 500 }
    );
  }
}