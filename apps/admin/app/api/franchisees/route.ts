import { NextRequest, NextResponse } from 'next/server';
import { getFromBff } from '@/lib/server-api-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    const endpoint = `/franchisees${queryString ? `?${queryString}` : ''}`;
    const data = await getFromBff(endpoint);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Franchisees API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch franchisees' },
      { status: 500 }
    );
  }
}
