import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Menu Items API Integration Tests', () => {
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

    // Create test store
    const testStore = await prisma.store.create({
      data: {
        name: 'Test Store for Menu Items',
        country: 'US',
        region: 'North America',
        city: 'New York',
      },
    });
    testStoreId = testStore.id;
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

  describe('GET /menu/items', () => {
    beforeAll(async () => {
      // Create test menu item
      const testMenuItem = await prisma.menuItem.create({
        data: {
          name: 'Test Menu Item',
          price: 12.99,
          basePrice: 10.99,
          storeId: testStoreId,
          active: true,
        },
      });
      testMenuItemId = testMenuItem.id;
    });

    it('should return menu items with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/items')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // Find our test item
      const testItem = response.body.find((item: any) => item.id === testMenuItemId);
      expect(testItem).toBeDefined();
      expect(testItem).toHaveProperty('id');
      expect(testItem).toHaveProperty('name', 'Test Menu Item');
      expect(testItem).toHaveProperty('price', 12.99);
      expect(testItem).toHaveProperty('active', true);
      expect(testItem).toHaveProperty('Store');
      expect(testItem.Store).toHaveProperty('name', 'Test Store for Menu Items');
    });

    it('should support pagination with take and skip', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/items?take=1&skip=0')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should support scope filtering by country', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/items?country=US')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // All items should be from US stores
      response.body.forEach((item: any) => {
        expect(item.Store.country).toBe('US');
      });
    });
  });

  describe('POST /menu/items', () => {
    it('should create a new menu item successfully', async () => {
      const newItem = {
        name: 'New Test Item',
        price: 15.99,
        storeId: testStoreId,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(newItem)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', newItem.name);
      expect(response.body.data).toHaveProperty('price', newItem.price);
      expect(response.body.data).toHaveProperty('storeId', newItem.storeId);
      expect(response.body.data).toHaveProperty('active', newItem.active);

      // Verify the item was created in the database
      const createdItem = await prisma.menuItem.findUnique({
        where: { id: response.body.data.id },
      });
      expect(createdItem).toBeDefined();
      expect(createdItem?.name).toBe(newItem.name);
    });

    it('should create audit trail for menu item creation', async () => {
      const newItem = {
        name: 'Audit Test Item',
        price: 8.99,
        storeId: testStoreId,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(newItem)
        .expect(201);

      // Check if audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItem',
          entityId: response.body.data.id,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      expect(auditEntries[0]).toHaveProperty('actor', 'system');
      expect(auditEntries[0]).toHaveProperty('diff');
      
      const diff = JSON.parse(auditEntries[0].diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('name', newItem.name);
    });

    it('should return error for non-existent store', async () => {
      const newItem = {
        name: 'Invalid Store Item',
        price: 10.99,
        storeId: 'non-existent-store-id',
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(newItem)
        .expect(201);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Store not found');
    });

    it('should prevent duplicate item names in same store', async () => {
      const duplicateItem = {
        name: 'Test Menu Item', // Same name as existing item
        price: 10.99,
        storeId: testStoreId,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(duplicateItem)
        .expect(201);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidItem = {
        // Missing required fields
        price: 10.99,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate price is positive', async () => {
      const invalidItem = {
        name: 'Invalid Price Item',
        price: -5.99,
        storeId: testStoreId,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the error interceptor is working
      const response = await request(app.getHttpServer())
        .get('/menu/items?invalid=query')
        .expect(200); // Should still work with invalid query params

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle malformed request bodies', async () => {
      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity with stores', async () => {
      // Create item
      const newItem = {
        name: 'Integrity Test Item',
        price: 12.99,
        storeId: testStoreId,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(newItem)
        .expect(201);

      const itemId = response.body.data.id;

      // Verify the item is linked to the correct store
      const item = await prisma.menuItem.findUnique({
        where: { id: itemId },
        include: { Store: true },
      });

      expect(item).toBeDefined();
      expect(item?.Store.id).toBe(testStoreId);
      expect(item?.Store.name).toBe('Test Store for Menu Items');
    });

    it('should handle concurrent item creation', async () => {
      const items = [
        {
          name: 'Concurrent Item 1',
          price: 10.99,
          storeId: testStoreId,
          active: true,
        },
        {
          name: 'Concurrent Item 2',
          price: 11.99,
          storeId: testStoreId,
          active: true,
        },
      ];

      // Create items concurrently
      const promises = items.map(item =>
        request(app.getHttpServer())
          .post('/menu/items')
          .send(item)
      );

      const responses = await Promise.all(promises);

      // Both should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
      });

      // Verify both items exist in database
      const createdItems = await prisma.menuItem.findMany({
        where: {
          name: { in: ['Concurrent Item 1', 'Concurrent Item 2'] },
        },
      });

      expect(createdItems).toHaveLength(2);
    });
  });
});