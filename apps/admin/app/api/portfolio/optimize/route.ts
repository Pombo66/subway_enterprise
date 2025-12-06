import { NextRequest, NextResponse } from 'next/server';
import { postToBff } from '@/lib/server-api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔄 [API] Portfolio optimization request:', body);
    
    // Forward to BFF
    const response = await postToBff('/portfolio/optimize', body);
    
    console.log('✅ [API] Portfolio optimization complete:', {
      stores: response.selectedStores?.length,
      investment: response.summary?.totalInvestment
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [API] Portfolio optimization failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Portfolio optimization failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
