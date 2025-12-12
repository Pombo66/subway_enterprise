import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../lib/db';

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Diagnosing franchisee data...');
    
    // Check basic counts
    const totalStores = await prisma.store.count();
    const storesWithOwners = await prisma.store.count({
      where: { ownerName: { not: null } }
    });
    const storesWithFranchisees = await prisma.store.count({
      where: { franchiseeId: { not: null } }
    });
    const totalFranchisees = await prisma.franchisee.count();
    
    // Get sample stores with ownerName
    const sampleStores = await prisma.store.findMany({
      where: { ownerName: { not: null } },
      select: {
        id: true,
        name: true,
        ownerName: true,
        franchiseeId: true,
        city: true,
        country: true
      },
      take: 5
    });
    
    // Get owner name frequency
    const ownerStats = await prisma.store.groupBy({
      by: ['ownerName'],
      _count: { ownerName: true },
      where: { ownerName: { not: null } },
      orderBy: { _count: { ownerName: 'desc' } },
      take: 10
    });
    
    const diagnosis = {
      counts: {
        totalStores,
        storesWithOwners,
        storesWithFranchisees,
        totalFranchisees
      },
      sampleStores,
      ownerStats,
      issue: storesWithOwners > 0 && totalFranchisees === 0 ? 
        'REGRESSION_CONFIRMED: ownerName data exists but no franchisees created' :
        storesWithOwners === 0 ? 
        'NO_OWNER_DATA: No stores have ownerName' :
        'UNKNOWN'
    };
    
    return NextResponse.json({
      success: true,
      data: diagnosis
    });
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Diagnosis failed'
    }, { status: 500 });
  }
}