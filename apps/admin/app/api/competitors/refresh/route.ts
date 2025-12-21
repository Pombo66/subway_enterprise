import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/competitors/refresh
 * 
 * DEPRECATED - This endpoint has been replaced by the on-demand competitor
 * discovery system using Google Places API.
 * 
 * Users should now use the "Show competitors (5km)" button in the store
 * or expansion suggestion detail panels to fetch competitor data.
 * 
 * @deprecated Use POST /api/competitors/nearby instead
 * @returns 410 Gone with deprecation message
 */
export async function POST(request: NextRequest) {
  console.log('⚠️ DEPRECATED: /api/competitors/refresh called - returning 410 Gone');
  
  return NextResponse.json(
    {
      success: false,
      error: 'This endpoint has been deprecated',
      message: 'The competitor refresh feature has been replaced by on-demand competitor discovery. ' +
               'To view competitors, click on a store or expansion suggestion and use the ' +
               '"Show competitors (5km)" button in the detail panel.',
      migration: {
        newEndpoint: 'POST /api/competitors/nearby',
        documentation: 'The new system uses Google Places API for more accurate, real-time competitor data.',
        usage: 'Click "Show competitors (5km)" in store or suggestion detail panels'
      }
    },
    { status: 410 } // 410 Gone - resource no longer available
  );
}