import { NextRequest, NextResponse } from 'next/server';
import { postToBff } from '@/lib/server-api-client';

/**
 * POST /api/competitors/nearby
 * 
 * Proxy to BFF endpoint for on-demand competitor discovery.
 * Fetches nearby competitors using Google Places API.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: lat and lng are required numbers' 
        },
        { status: 400 }
      );
    }
    
    const data = await postToBff('/competitors/nearby', body);
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Competitors nearby API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many requests. Please wait a moment before trying again.' 
        },
        { status: 429 }
      );
    }
    
    if (error.message?.includes('503') || error.message?.includes('unavailable')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Competitor service temporarily unavailable' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch nearby competitors' },
      { status: 500 }
    );
  }
}
