import { NextRequest, NextResponse } from 'next/server';
import { getFromBff } from '@/lib/server-api-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log('🔄 [API] Fetching store details for ID:', id);
    
    // Use the same authentication helper as the stores list
    const response = await getFromBff(`/stores/${id}`);
    
    console.log('✅ [API] BFF returned response:', JSON.stringify(response, null, 2));
    
    // Check if response is wrapped in {success, data} format
    let store = response;
    if (response && response.success && response.data) {
      console.log('✅ [API] Unwrapping response.data');
      store = response.data;
    }
    
    // Validate store has required fields
    if (!store || !store.id) {
      console.error('❌ [API] Invalid store structure:', store);
      return NextResponse.json(
        { error: 'Invalid store data from BFF' },
        { status: 500 }
      );
    }
    
    console.log('✅ [API] Returning store:', store.name, store.city);
    
    return NextResponse.json(store);
  } catch (error) {
    console.error('❌ [API] Error fetching store:', error);
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
