import { NextRequest, NextResponse } from 'next/server';
import { getFromBff } from '@/lib/server-api-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log('🔄 Fetching store details for ID:', id);
    
    // Use the same authentication helper as the stores list
    const data = await getFromBff(`/stores/${id}`);
    
    console.log('✅ Successfully fetched store:', data);
    
    return NextResponse.json(data);
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
    
    console.log('🔄 Updating store:', id, body);
    
    // Forward to BFF with authentication
    const { putToBff } = await import('@/lib/server-api-client');
    const data = await putToBff(`/stores/${id}`, body);
    
    console.log('✅ Successfully updated store');
    
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
    
    console.log('🔄 Deleting store:', id);
    
    // Forward to BFF with authentication
    const { deleteFromBff } = await import('@/lib/server-api-client');
    const data = await deleteFromBff(`/stores/${id}`);
    
    console.log('✅ Successfully deleted store');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error deleting store:', error);
    return NextResponse.json(
      { error: 'Failed to delete store' },
      { status: 500 }
    );
  }
}
