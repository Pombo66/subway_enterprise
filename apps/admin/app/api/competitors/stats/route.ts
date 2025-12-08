import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const response = await fetch(
      `${BFF_URL}/competitive-intelligence/competitors/stats${queryString ? `?${queryString}` : ''}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Competitor stats API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
