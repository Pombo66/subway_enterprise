import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🏢 Admin API: Refreshing competitors with params:', body);
    
    const response = await fetch(
      `${BFF_URL}/competitive-intelligence/competitors/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ BFF competitor refresh failed:', data);
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Competitor refresh failed' },
        { status: response.status }
      );
    }
    
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