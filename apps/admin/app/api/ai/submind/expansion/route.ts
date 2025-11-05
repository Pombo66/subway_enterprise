import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { region, reasons } = body;

    console.info('🤖 API: SubMind expansion analysis request', { region, reasonsCount: reasons?.length });

    // Call BFF service
    const bffUrl = `${process.env.BFF_URL || 'http://localhost:3001'}/ai/submind/expansion`;
    
    const response = await fetch(bffUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ region, reasons }),
    });

    if (!response.ok) {
      throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.info('✅ API: SubMind expansion analysis completed');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ API: SubMind expansion analysis failed:', error);
    
    return NextResponse.json(
      { 
        error: 'SubMind expansion analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}