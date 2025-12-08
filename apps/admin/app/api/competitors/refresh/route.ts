import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Competitor refresh API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
