import { NextRequest, NextResponse } from 'next/server';
import { getFromBff, postToBff } from '@/lib/server-api-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    const endpoint = `/competitive-intelligence/competitors${queryString ? `?${queryString}` : ''}`;
    const data = await getFromBff(endpoint);
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Competitors API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const data = await postToBff('/competitive-intelligence/competitors', body);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Create competitor API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
