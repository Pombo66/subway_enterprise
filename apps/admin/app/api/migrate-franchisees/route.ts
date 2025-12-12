import { NextRequest, NextResponse } from 'next/server';
import { FranchiseeProcessor } from '../../../lib/services/franchisee-processor';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting franchisee migration...');
    
    const result = await FranchiseeProcessor.migrateExistingStores();
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    }, { status: 500 });
  }
}

// Only allow POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}