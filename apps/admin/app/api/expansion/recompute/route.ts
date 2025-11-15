import { NextRequest, NextResponse } from 'next/server';
import { postToBff } from '@/lib/server-api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { region } = body;

    console.info('🔄 API: Recomputing expansion scores', { region });

    // Call BFF service with authentication
    const data = await postToBff('/expansion/recompute', { region });
    
    console.info('✅ API: Expansion scores recomputed successfully', {
      processed: data.processed
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ API: Failed to recompute expansion scores:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to recompute expansion scores',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}