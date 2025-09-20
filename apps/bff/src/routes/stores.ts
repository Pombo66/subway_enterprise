import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { findEmeaCountry } from '../util/emea';
import { parseScope, makeWhere } from '../util/scope';

@Controller()
export class StoresController {
  constructor(@Inject(PrismaClient) private readonly prisma: PrismaClient) {}

  @Get('/stores')
  async list(@Query() q: Record<string, any>) {
    const where = makeWhere(parseScope(q)); // supports region/country/storeId
    const storeWhere: any = where.store ?? {};
    return this.prisma.store.findMany({
      where: storeWhere,
      select: { id: true, name: true, country: true, region: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: q.take ? Number(q.take) : 50,
    });
  }

  @Post('/stores')
  async create(@Body() body: { name?: string; country?: string }) {
    const name = (body.name || '').trim();
    const match = findEmeaCountry(body.country);
    if (!name) return { ok: false, error: 'Name is required' };
    if (!match) return { ok: false, error: 'Country must be in EMEA (full name or ISO code)' };
    const rec = await this.prisma.store.create({
      data: { name, country: match.name, region: 'EMEA' }, // store full name
      select: { id: true, name: true, country: true, region: true, createdAt: true },
    });
    return { ok: true, store: rec };
  }
}
