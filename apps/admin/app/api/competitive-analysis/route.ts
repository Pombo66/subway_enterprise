import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(
      `${BFF_URL}/competitive-intelligence/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Competitive analysis API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius');
    
    if (!lat || !lng) {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude required' },
        { status: 400 }
      );
    }

    const queryString = new URLSearchParams({
      lat,
      lng,
      ...(radius && { radius }),
    }).toString();
    
    const response = await fetch(
      `${BFF_URL}/competitive-intelligence/analysis/location?${queryString}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Competitive analysis API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
