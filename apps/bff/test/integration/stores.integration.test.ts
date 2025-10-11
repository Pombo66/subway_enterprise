import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Stores API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testMenuItemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    prisma = moduleFixture.get<PrismaClient>(PrismaClient);
    await app.init();

    // Create test store
    const testStore = await prisma.store.create({
      data: {
        name: 'Test Store for Integration',
        country: 'CA',
        region: 'North America',
        city: 'Toronto',
      },
    });
    testStoreId = testStore.id;

    // Create test menu item for pricing overrides
    const testMenuItem = await prisma.menuItem.create({
      data: {
        name: 'Test Item for Pricing',
        price: 12.99,
        basePrice: 10.99,
        storeId: testStoreId,
        active: true,
      },
    });
    testMenuItemId = testMenuItem.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.priceOverride.deleteMany({
      where: { storeId: testStoreId },
    });
    await prisma.menuItem.deleteMany({
      where: { storeId: testStoreId },
    });
    await prisma.store.deleteMany({
      where: { name: { contains: 'Test Store' } },
    });
    await app.close();
  });

  describe('GET /stores', () => {
    beforeAll(async () => {
      // Create additional test stores for filtering
      await prisma.store.createMany({
        data: [
          {
            name: 'Test Store US East',
            country: 'US',
            region: 'North America',
            city: 'New York',
          },
          {
            name: 'Test Store US West',
            country: 'US',
            region: 'North America',
            city: 'Los Angeles',
          },
          {
            name: 'Test Store UK',
            country: 'UK',
            region: 'Europe',
            city: 'London',
          },
        ],
      });
    });

    it('should return all stores with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Find our test store
      const testStore = response.body.find((store: any) => store.id === testStoreId);
      expect(testStore).toBeDefined();
      expect(testStore).toHaveProperty('name', 'Test Store for Integration');
      expect(testStore).toHaveProperty('country', 'CA');
      expect(testStore).toHaveProperty('region', 'North America');
      expect(testStore).toHaveProperty('city', 'Toronto');
    });

    it('should support country filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores?country=US')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All stores should be from US
      response.body.forEach((store: any) => {
        expect(store.country).toBe('US');
      });
    });

    it('should support region filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores?region=Europe')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All stores should be from Europe
      response.body.forEach((store: any) => {
        expect(store.region).toBe('Europe');
      });
    });

    it('should support city filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores?city=Toronto')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All stores should be from Toronto
      response.body.forEach((store: any) => {
        expect(store.city).toBe('Toronto');
      });
    });

    it('should support pagination with take and skip', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores?take=2&skip=0')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    it('should support combined filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores?country=US&region=North America')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((store: any) => {
        expect(store.country).toBe('US');
        expect(store.region).toBe('North America');
      });
    });
  });

  describe('GET /stores/:id', () => {
    it('should return store details successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/stores/${testStoreId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testStoreId);
      expect(response.body).toHaveProperty('name', 'Test Store for Integration');
      expect(response.body).toHaveProperty('country', 'CA');
      expect(response.body).toHaveProperty('region', 'North America');
      expect(response.body).toHaveProperty('city', 'Toronto');
    });

    it('should return 404 for non-existent store', async () => {
      const response = await request(app.getHttpServer())
        .get('/stores/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Store not found');
    });
  });

  describe('POST /stores', () => {
    it('should create a new store successfully', async () => {
      const newStore = {
        name: 'New Test Store',
        country: 'FR',
        region: 'Europe',
        city: 'Paris',
      };

      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(newStore)
        .expect(201);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('store');
      expect(response.body.store).toHaveProperty('name', newStore.name);
      expect(response.body.store).toHaveProperty('country', newStore.country);
      expect(response.body.store).toHaveProperty('region', newStore.region);
      expect(response.body.store).toHaveProperty('city', newStore.city);

      // Verify the store was created in the database
      const createdStore = await prisma.store.findUnique({
        where: { id: response.body.store.id },
      });
      expect(createdStore).toBeDefined();
      expect(createdStore?.name).toBe(newStore.name);
    });

    it('should create audit trail for store creation', async () => {
      const newStore = {
        name: 'Audit Test Store',
        country: 'DE',
        region: 'Europe',
        city: 'Berlin',
      };

      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(newStore)
        .expect(201);

      // Check if audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'Store',
          entityId: response.body.store.id,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]).toHaveProperty('actor', 'system');
      expect(auditEntries[0]).toHaveProperty('diff');
      
      const diff = JSON.parse(auditEntries[0].diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('name', newStore.name);
    });

    it('should validate required fields', async () => {
      const invalidStore = {
        // Missing required fields
        country: 'US',
      };

      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(invalidStore)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle validation errors gracefully', async () => {
      const invalidStore = {
        name: '', // Empty name
        country: 'US',
        region: 'North America',
        city: 'Boston',
      };

      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(invalidStore)
        .expect(201);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /stores/:id', () => {
    let updateStoreId: string;

    beforeAll(async () => {
      const store = await prisma.store.create({
        data: {
          name: 'Update Test Store',
          country: 'IT',
          region: 'Europe',
          city: 'Rome',
        },
      });
      updateStoreId = store.id;
    });

    it('should update store successfully', async () => {
      const updates = {
        name: 'Updated Test Store',
        city: 'Milan',
      };

      const response = await request(app.getHttpServer())
        .put(`/stores/${updateStoreId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
      expect(response.body).toHaveProperty('store');
      expect(response.body.store).toHaveProperty('name', updates.name);
      expect(response.body.store).toHaveProperty('city', updates.city);
      // Unchanged fields should remain the same
      expect(response.body.store).toHaveProperty('country', 'IT');
      expect(response.body.store).toHaveProperty('region', 'Europe');

      // Verify changes in database
      const updatedStore = await prisma.store.findUnique({
        where: { id: updateStoreId },
      });
      expect(updatedStore?.name).toBe(updates.name);
      expect(updatedStore?.city).toBe(updates.city);
    });

    it('should create audit trail for store updates', async () => {
      const updates = {
        name: 'Audit Updated Store',
      };

      const response = await request(app.getHttpServer())
        .put(`/stores/${updateStoreId}`)
        .send(updates)
        .expect(200);

      // Check if audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'Store',
          entityId: updateStoreId,
          action: 'UPDATE',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]).toHaveProperty('actor', 'system');
      expect(auditEntries[0]).toHaveProperty('diff');
      
      const diff = JSON.parse(auditEntries[0].diff || '{}');
      expect(diff).toHaveProperty('old');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('name', updates.name);
    });

    it('should return error for non-existent store', async () => {
      const response = await request(app.getHttpServer())
        .put('/stores/non-existent-id')
        .send({ name: 'New Name' })
        .expect(201);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /stores/:id', () => {
    let deleteStoreId: string;

    beforeEach(async () => {
      const store = await prisma.store.create({
        data: {
          name: 'Delete Test Store',
          country: 'ES',
          region: 'Europe',
          city: 'Madrid',
        },
      });
      deleteStoreId = store.id;
    });

    it('should delete store successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/stores/${deleteStoreId}`)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);

      // Verify store is deleted
      const deletedStore = await prisma.store.findUnique({
        where: { id: deleteStoreId },
      });
      expect(deletedStore).toBeNull();
    });

    it('should create audit trail for store deletion', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/stores/${deleteStoreId}`)
        .expect(200);

      // Check if audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'Store',
          entityId: deleteStoreId,
          action: 'DELETE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]).toHaveProperty('actor', 'system');
      expect(auditEntries[0]).toHaveProperty('diff');
      
      const diff = JSON.parse(auditEntries[0].diff || '{}');
      expect(diff).toHaveProperty('old');
      expect(diff.old).toHaveProperty('name', 'Delete Test Store');
    });

    it('should return error for non-existent store', async () => {
      const response = await request(app.getHttpServer())
        .delete('/stores/non-existent-id')
        .expect(201);

      expect(response.body).toHaveProperty('ok', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Store Pricing Overrides', () => {
    describe('GET /stores/:id/pricing-overrides', () => {
      beforeAll(async () => {
        // Create a price override for testing
        await prisma.priceOverride.create({
          data: {
            storeId: testStoreId,
            menuItemId: testMenuItemId,
            price: 15.99,
            effectiveFrom: new Date(),
          },
        });
      });

      it('should return pricing overrides for store', async () => {
        const response = await request(app.getHttpServer())
          .get(`/stores/${testStoreId}/pricing-overrides`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        const override = response.body[0];
        expect(override).toHaveProperty('storeId', testStoreId);
        expect(override).toHaveProperty('menuItemId', testMenuItemId);
        expect(override).toHaveProperty('price', 15.99);
        expect(override).toHaveProperty('effectiveFrom');
      });

      it('should return empty array for store with no overrides', async () => {
        // Create a store with no overrides
        const emptyStore = await prisma.store.create({
          data: {
            name: 'Empty Override Store',
            country: 'NL',
            region: 'Europe',
            city: 'Amsterdam',
          },
        });

        const response = await request(app.getHttpServer())
          .get(`/stores/${emptyStore.id}/pricing-overrides`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });
    });

    describe('POST /stores/:id/pricing-overrides', () => {
      it('should create pricing override successfully', async () => {
        const newOverride = {
          menuItemId: testMenuItemId,
          price: 18.99,
        };

        const response = await request(app.getHttpServer())
          .post(`/stores/${testStoreId}/pricing-overrides`)
          .send(newOverride)
          .expect(201);

        expect(response.body).toHaveProperty('storeId', testStoreId);
        expect(response.body).toHaveProperty('menuItemId', newOverride.menuItemId);
        expect(response.body).toHaveProperty('price', newOverride.price);
        expect(response.body).toHaveProperty('effectiveFrom');

        // Verify the override was created in the database
        const createdOverride = await prisma.priceOverride.findFirst({
          where: {
            storeId: testStoreId,
            menuItemId: newOverride.menuItemId,
            price: newOverride.price,
          },
        });
        expect(createdOverride).toBeDefined();
      });

      it('should validate required fields', async () => {
        const invalidOverride = {
          // Missing menuItemId
          price: 20.99,
        };

        const response = await request(app.getHttpServer())
          .post(`/stores/${testStoreId}/pricing-overrides`)
          .send(invalidOverride)
          .expect(400);

        expect(response.body).toHaveProperty('message');
      });

      it('should validate price is positive', async () => {
        const invalidOverride = {
          menuItemId: testMenuItemId,
          price: -5.99,
        };

        const response = await request(app.getHttpServer())
          .post(`/stores/${testStoreId}/pricing-overrides`)
          .send(invalidOverride)
          .expect(400);

        expect(response.body).toHaveProperty('message');
      });

      it('should return error for non-existent store', async () => {
        const newOverride = {
          menuItemId: testMenuItemId,
          price: 20.99,
        };

        const response = await request(app.getHttpServer())
          .post('/stores/non-existent-id/pricing-overrides')
          .send(newOverride)
          .expect(404);

        expect(response.body).toHaveProperty('message');
      });

      it('should return error for non-existent menu item', async () => {
        const newOverride = {
          menuItemId: 'non-existent-item-id',
          price: 20.99,
        };

        const response = await request(app.getHttpServer())
          .post(`/stores/${testStoreId}/pricing-overrides`)
          .send(newOverride)
          .expect(400);

        expect(response.body).toHaveProperty('message');
      });
    });

    describe('DELETE /stores/:id/pricing-overrides/:itemId', () => {
      let overrideToDelete: any;

      beforeEach(async () => {
        overrideToDelete = await prisma.priceOverride.create({
          data: {
            storeId: testStoreId,
            menuItemId: testMenuItemId,
            price: 22.99,
            effectiveFrom: new Date(),
          },
        });
      });

      it('should delete pricing override successfully', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/stores/${testStoreId}/pricing-overrides/${testMenuItemId}`)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Price override deleted successfully');

        // Verify the override is deleted
        const deletedOverride = await prisma.priceOverride.findUnique({
          where: { id: overrideToDelete.id },
        });
        expect(deletedOverride).toBeNull();
      });

      it('should return error for non-existent override', async () => {
        // Delete the override first
        await prisma.priceOverride.delete({
          where: { id: overrideToDelete.id },
        });

        const response = await request(app.getHttpServer())
          .delete(`/stores/${testStoreId}/pricing-overrides/${testMenuItemId}`)
          .expect(404);

        expect(response.body).toHaveProperty('message');
      });

      it('should return error for non-existent store', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/stores/non-existent-id/pricing-overrides/${testMenuItemId}`)
          .expect(404);

        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('Data Integrity and Relationships', () => {
    it('should maintain referential integrity between stores and menu items', async () => {
      // Create a store and menu item
      const store = await prisma.store.create({
        data: {
          name: 'Integrity Test Store',
          country: 'JP',
          region: 'Asia',
          city: 'Tokyo',
        },
      });

      const menuItem = await prisma.menuItem.create({
        data: {
          name: 'Integrity Test Item',
          price: 8.99,
          storeId: store.id,
          active: true,
        },
      });

      // Verify the relationship
      const itemWithStore = await prisma.menuItem.findUnique({
        where: { id: menuItem.id },
        include: { Store: true },
      });

      expect(itemWithStore).toBeDefined();
      expect(itemWithStore?.Store.id).toBe(store.id);
      expect(itemWithStore?.Store.name).toBe('Integrity Test Store');
    });

    it('should handle concurrent store operations', async () => {
      const stores = [
        {
          name: 'Concurrent Store 1',
          country: 'AU',
          region: 'Oceania',
          city: 'Sydney',
        },
        {
          name: 'Concurrent Store 2',
          country: 'AU',
          region: 'Oceania',
          city: 'Melbourne',
        },
      ];

      // Create stores concurrently
      const promises = stores.map(store =>
        request(app.getHttpServer())
          .post('/stores')
          .send(store)
      );

      const responses = await Promise.all(promises);

      // Both should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('ok', true);
      });

      // Verify both stores exist in database
      const createdStores = await prisma.store.findMany({
        where: {
          name: { in: ['Concurrent Store 1', 'Concurrent Store 2'] },
        },
      });

      expect(createdStores).toHaveLength(2);
    });
  });
});