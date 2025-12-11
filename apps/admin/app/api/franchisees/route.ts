import { NextRequest, NextResponse } from 'next/server';
import { getFromBff } from '@/lib/server-api-client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    const endpoint = `/franchisees${queryString ? `?${queryString}` : ''}`;
    const bffData = await getFromBff(endpoint);
    
    // BFF returns {success: true, data: {franchisees: [...], summary: {...}}} format
    // Extract the data for the frontend
    if (bffData.success && bffData.data) {
      return NextResponse.json(bffData.data);
    } else {
      throw new Error('Invalid BFF response format');
    }
  } catch (error) {
    console.error('Franchisees API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch franchisees' },
      { status: 500 }
    );
  }
}
