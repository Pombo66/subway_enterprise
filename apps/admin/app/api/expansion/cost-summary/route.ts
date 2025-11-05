import { NextRequest, NextResponse } from 'next/server';
import { OpenAISafetyWrapper } from '../../../../lib/services/openai-safety-wrapper';

export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Cost summary only available in development' },
        { status: 403 }
      );
    }

    const summary = OpenAISafetyWrapper.getCostSummary();
    
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Failed to get cost summary:', error);
    return NextResponse.json(
      { error: 'Failed to get cost summary' },
      { status: 500 }
    );
  }
}