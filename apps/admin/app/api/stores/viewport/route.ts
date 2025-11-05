import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const north = parseFloat(searchParams.get('north') || '');
  const south = parseFloat(searchParams.get('south') || '');
  const east = parseFloat(searchParams.get('east') || '');
  const west = parseFloat(searchParams.get('west') || '');
  const zoom = parseInt(searchParams.get('zoom') || '10');

  // Validate bounds
  if (isNaN(north) || isNaN(south) || isNaN(east) || isNaN(west)) {
    return NextResponse.json(
      { error: 'Invalid viewport bounds. Required: north, south, east, west' },
      { status: 400 }
    );
  }

  // Validate bounds are reasonable
  if (north < south || east < west) {
    return NextResponse.json(
      { error: 'Invalid viewport bounds. North must be > south, east must be > west' },
      { status: 400 }
    );
  }

  // Validate latitude range
  if (north > 90 || south < -90) {
    return NextResponse.json(
      { error: 'Invalid latitude. Must be between -90 and 90' },
      { status: 400 }
    );
  }

  // Validate longitude range
  if (east > 180 || west < -180) {
    return NextResponse.json(
      { error: 'Invalid longitude. Must be between -180 and 180' },
      { status: 400 }
    );
  }

  try {
    console.log(`📍 Viewport query: N=${north}, S=${south}, E=${east}, W=${west}, zoom=${zoom}`);

    // Query stores within bounds
    const stores = await prisma.store.findMany({
      where: {
        latitude: {
          gte: south,
          lte: north
        },
        longitude: {
          gte: west,
          lte: east
        }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        country: true,
        region: true
      },
      take: 1000 // Limit for performance
    });

    console.log(`✅ Found ${stores.length} stores in viewport`);

    return NextResponse.json({
      stores,
      count: stores.length,
      viewport: { north, south, east, west },
      zoom
    });
  } catch (error: any) {
    console.error('Viewport query error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stores',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
