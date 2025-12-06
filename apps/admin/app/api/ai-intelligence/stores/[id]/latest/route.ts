import { NextResponse } from 'next/server';
import { getFromBff } from '@/lib/server-api-client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    console.log('🔄 Fetching latest AI analysis for store:', id);
    
    // Fetch from BFF with authentication
    const data = await getFromBff(`/ai/intelligence/stores/${id}/latest`);
    
    console.log('✅ Successfully fetched AI analysis');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching AI analysis:', error);
    return NextResponse.json(
      { hasAnalysis: false, error: 'Failed to fetch AI analysis' },
      { status: 500 }
    );
  }
}
