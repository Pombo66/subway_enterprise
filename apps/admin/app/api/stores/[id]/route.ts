import { NextRequest, NextResponse } from 'next/server';

// Use NEXT_PUBLIC_BFF_URL for production, fallback to localhost for dev
const BFF_BASE_URL = process.env.NEXT_PUBLIC_BFF_URL || process.env.BFF_BASE_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🔍 Fetching store ${id} via BFF`);

    // Forward to BFF
    const response = await fetch(`${BFF_BASE_URL}/stores/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BFF request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Store ${id} fetched successfully:`, data);

    // BFF returns data wrapped in {success, data} format
    // Extract the actual store data
    const store = data.success ? data.data : data;
    return NextResponse.json(store);
  } catch (error) {
    console.error('❌ Error fetching store:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    console.log(`🔄 Updating store ${id} via BFF`);

    // Forward to BFF
    const response = await fetch(`${BFF_BASE_URL}/stores/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`BFF request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Store ${id} updated successfully`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error updating store:', error);
    return NextResponse.json(
      { error: 'Failed to update store' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log(`🗑️ Deleting store ${id} via BFF`);

    // Forward to BFF
    const response = await fetch(`${BFF_BASE_URL}/stores/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BFF request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Store ${id} deleted successfully`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error deleting store:', error);
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    );
  }
}
