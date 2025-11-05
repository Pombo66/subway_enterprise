import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, userId, sessionId, properties, timestamp } = body;

    console.info('📊 API: Telemetry event received', {
      eventType,
      userId,
      sessionId,
      timestamp
    });

    // Call BFF service
    const bffUrl = `${process.env.BFF_URL || 'http://localhost:3001'}/telemetry`;
    
    const response = await fetch(bffUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        userId,
        sessionId,
        properties,
        timestamp
      }),
    });

    if (!response.ok) {
      throw new Error(`BFF request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ API: Telemetry event failed:', error);
    
    // Don't fail telemetry requests - just log and return success
    return NextResponse.json({ success: true });
  }
}