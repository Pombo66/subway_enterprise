import { NextResponse } from 'next/server';
import { postToBff } from '@/lib/server-api-client';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log('🔄 Triggering AI analysis for store:', id);
    
    // Forward to BFF with authentication
    const data = await postToBff(`/ai/intelligence/analyze/${id}`, body);
    
    console.log('✅ Successfully triggered AI analysis');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error triggering AI analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to trigger AI analysis' },
      { status: 500 }
    );
  }
}
