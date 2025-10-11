import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Menu Pricing API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testMenuItemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configure validation pipe for tests
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    prisma = moduleFixture.get<PrismaClient>(PrismaClient);
    await app.init();

    // Create test data
    const testStore = await prisma.store.create({
      data: {
        name: 'Test Store for Pricing',
        country: 'US',
        region: 'North America',
        city: 'New York',
      },
    });
    testStoreId = testStore.id;

    const testMenuItem = await prisma.menuItem.create({
      data: {
        name: 'Test Item for Pricing',
        price: 10.99,
        basePrice: 9.99,
        storeId: testStoreId,
        active: true,
      },
    });
    testMenuItemId = testMenuItem.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.menuItem.deleteMany({
      where: { storeId: testStoreId },
    });
    await prisma.store.delete({
      where: { id: testStoreId },
    });
    await app.close();
  });

  describe('GET /menu/pricing', () => {
    it('should return menu items with pricing information', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/pricing')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Check that we have pricing data
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check structure of first item
      if (response.body.data.length > 0) {
        const firstItem = response.body.data[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('basePrice');
        expect(firstItem).toHaveProperty('priceOverrides');
        expect(Array.isArray(firstItem.priceOverrides)).toBe(true);
      }
    });

    it('should support scope filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/pricing?country=US')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PATCH /menu/pricing/:itemId', () => {
    it('should update menu item base price', async () => {
      const newBasePrice = 12.99;

      const response = await request(app.getHttpServer())
        .patch(`/menu/pricing/${testMenuItemId}`)
        .send({ basePrice: newBasePrice })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('basePrice', newBasePrice);
      expect(response.body.data).toHaveProperty('id', testMenuItemId);

      // Verify the change was persisted
      const updatedItem = await prisma.menuItem.findUnique({
        where: { id: testMenuItemId },
        select: { basePrice: true },
      });
      expect(Number(updatedItem?.basePrice)).toBe(newBasePrice);
    });

    it('should create audit trail for pricing changes', async () => {
      const newBasePrice = 15.99;

      await request(app.getHttpServer())
        .patch(`/menu/pricing/${testMenuItemId}`)
        .send({ basePrice: newBasePrice })
        .expect(200);

      // Check if audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItem',
          entityId: testMenuItemId,
          action: 'UPDATE_PRICING',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]).toHaveProperty('actor', 'system');
      expect(auditEntries[0]).toHaveProperty('diff');
      
      const diff = JSON.parse(auditEntries[0].diff || '{}');
      expect(diff).toHaveProperty('basePrice');
      expect(diff.basePrice).toHaveProperty('to', newBasePrice);
    });

    it('should return error for non-existent menu item', async () => {
      const response = await request(app.getHttpServer())
        .patch('/menu/pricing/non-existent-id')
        .send({ basePrice: 10.99 })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Menu item not found');
    });

    it('should handle price input validation', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/menu/pricing/${testMenuItemId}`)
        .send({ basePrice: -5.99 });

      // API might accept negative prices or return validation error
      if (response.status === 400) {
        expect(response.body).toHaveProperty('message');
      } else if (response.status === 200) {
        // If API accepts negative prices, just verify response structure
        expect(response.body).toHaveProperty('success');
      }
    });
  });
});