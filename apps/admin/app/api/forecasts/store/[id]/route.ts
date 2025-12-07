import { NextRequest, NextResponse } from 'next/server';

const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const horizonMonths = searchParams.get('horizonMonths') || '12';
    const regenerate = searchParams.get('regenerate') || 'false';

    const response = await fetch(
      `${BFF_URL}/forecasts/store/${id}?horizonMonths=${horizonMonths}&regenerate=${regenerate}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Forecast proxy error:', error);
    return NextResponse.json(
      { message: 'Failed to load forecast' },
      { status: 500 }
    );
  }
}
