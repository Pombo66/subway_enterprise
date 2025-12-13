import { NextRequest, NextResponse } from 'next/server';
import { postToBff } from '@/lib/server-api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🏢 Admin API: Refreshing competitors with params:', body);
    
    const data = await postToBff('/competitive-intelligence/competitors/refresh', body);
    
    console.log('✅ Admin API: Competitor refresh successful:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Admin API competitor refresh error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}