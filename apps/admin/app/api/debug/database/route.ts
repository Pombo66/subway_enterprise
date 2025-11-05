import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get database URL from environment
    const databaseUrl = process.env.DATABASE_URL;
    
    // Try to count stores
    const storeCount = await prisma.store.count();
    
    // Get a sample store
    const sampleStore = await prisma.store.findFirst({
      select: {
        id: true,
        name: true,
        country: true,
        latitude: true,
        longitude: true
      }
    });

    return NextResponse.json({
      databaseUrl,
      storeCount,
      sampleStore
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      databaseUrl: process.env.DATABASE_URL
    }, { status: 500 });
  }
}