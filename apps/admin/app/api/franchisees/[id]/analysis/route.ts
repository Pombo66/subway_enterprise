import { NextRequest, NextResponse } from 'next/server';
import { getFromBff, postToBff } from '@/lib/server-api-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bffData = await getFromBff(`/franchisees/${params.id}/analysis`);
    
    // BFF returns {success: true, data: {...}} format due to ErrorInterceptor
    // Extract the data for the frontend
    if (bffData.success && bffData.data) {
      return NextResponse.json(bffData.data);
    } else {
      throw new Error('Invalid BFF response format');
    }
  } catch (error) {
    console.error('Franchisee analysis API error:', error);
    
    // Provide more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: 'Failed to fetch franchisee analysis',
      details: errorMessage,
      franchiseeId: params.id,
      bffUrl: process.env.NEXT_PUBLIC_BFF_URL,
      hasSecret: !!process.env.INTERNAL_ADMIN_SECRET,
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bffData = await postToBff(`/franchisees/${params.id}/analyze`);
    
    // BFF returns {success: true, data: {...}} format due to ErrorInterceptor
    // Extract the data for the frontend
    if (bffData.success && bffData.data) {
      return NextResponse.json(bffData.data);
    } else {
      throw new Error('Invalid BFF response format');
    }
  } catch (error) {
    console.error('Franchisee analysis generation API error:', error);
    
    // Provide more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      error: 'Failed to generate franchisee analysis',
      details: errorMessage,
      franchiseeId: params.id,
      bffUrl: process.env.NEXT_PUBLIC_BFF_URL,
      hasSecret: !!process.env.INTERNAL_ADMIN_SECRET,
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
  }
}