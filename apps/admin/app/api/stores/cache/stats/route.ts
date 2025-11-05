import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Note: Cache statistics are client-side (IndexedDB)
    // This endpoint provides server-side cache info
    
    const stats = {
      timestamp: new Date().toISOString(),
      serverCache: {
        enabled: false,
        note: 'Store caching is client-side using IndexedDB'
      },
      clientCache: {
        type: 'IndexedDB',
        database: 'subway_stores',
        maxAge: '24 hours',
        features: [
          'Instant loading from cache',
          'Background refresh when stale',
          'Cross-tab synchronization',
          'Viewport-based queries'
        ]
      },
      recommendations: {
        checkBrowserDevTools: 'Application > IndexedDB > subway_stores',
        clearCache: 'Use the Refresh button in the UI or clear browser data'
      }
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get cache stats', message: error.message },
      { status: 500 }
    );
  }
}
