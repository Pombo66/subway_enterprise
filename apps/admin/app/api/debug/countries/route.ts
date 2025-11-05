import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get unique countries
    const countries = await prisma.store.groupBy({
      by: ['country'],
      _count: {
        country: true
      },
      orderBy: {
        _count: {
          country: 'desc'
        }
      }
    });

    return NextResponse.json({
      countries: countries.map(c => ({
        country: c.country,
        count: c._count.country
      }))
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}