import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/stores/planned
 * Save an expansion suggestion as a planned store
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suggestion, scenarioId } = body;

    if (!suggestion || !suggestion.lat || !suggestion.lng) {
      return NextResponse.json(
        { error: 'Invalid suggestion data' },
        { status: 400 }
      );
    }

    // Create store name from city or coordinates
    const storeName = suggestion.city 
      ? `${suggestion.city} - AI Suggested`
      : `Location ${suggestion.lat.toFixed(4)}, ${suggestion.lng.toFixed(4)}`;

    // Create the planned store
    const store = await prisma.store.create({
      data: {
        name: storeName,
        city: suggestion.city || null,
        address: suggestion.specificLocation || suggestion.address || null,
        country: 'Germany', // TODO: Get from suggestion or context
        region: 'EMEA', // TODO: Get from suggestion or context
        status: 'Planned',
        latitude: suggestion.lat,
        longitude: suggestion.lng,
        isAISuggested: true, // Mark as AI-suggested for purple ring
        // Store AI metadata in available fields
        ownerName: suggestion.rationaleText 
          ? `AI: ${suggestion.rationaleText.substring(0, 100)}...`
          : 'AI Suggested Location',
      }
    });

    console.log(`✅ Created planned store from AI suggestion: ${store.id}`);
    console.log(`   Location: ${store.city || 'Unknown'} (${store.latitude}, ${store.longitude})`);
    console.log(`   Confidence: ${suggestion.confidence ? (suggestion.confidence * 100).toFixed(0) + '%' : 'N/A'}`);

    // Emit telemetry event
    await prisma.telemetryEvent.create({
      data: {
        eventType: 'expansion.suggestion_saved_as_planned',
        userId: 'system', // TODO: Get from auth
        properties: JSON.stringify({
          storeId: store.id,
          city: store.city,
          confidence: suggestion.confidence,
          scenarioId: scenarioId || null,
          hasAIAnalysis: suggestion.hasAIAnalysis || false,
        })
      }
    });

    return NextResponse.json({
      success: true,
      store
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating planned store:', error);
    return NextResponse.json(
      { error: 'Failed to create planned store' },
      { status: 500 }
    );
  }
}
