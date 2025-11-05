import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { region } = body;

    console.info('🔄 API: Recomputing expansion scores', { region });

    // Call BFF service
    const bffUrl = `${process.env.BFF_URL || 'http://localhost:3001'}/expansion/recompute`;
    
    const response = await fetch(bffUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ region }),
    });

    if (!response.ok) {
      throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
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