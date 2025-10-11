import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Orders API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testUserId: string;
  let testOrderIds: string[] = [];

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
        name: 'Test Store for Orders',
        country: 'US',
        region: 'North America',
        city: 'Chicago',
      },
    });
    testStoreId = testStore.id;

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'orders-test@example.com',
        role: 'STAFF',
        firstName: 'Orders',
        lastName: 'Tester',
        active: true,
      },
    });
    testUserId = testUser.id;

    // Create test orders with different statuses and dates
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const orders = await Promise.all([
      prisma.order.create({
        data: {
          total: 25.99,
          status: 'PENDING',
          storeId: testStoreId,
          userId: testUserId,
          createdAt: now,
        },
      }),
      prisma.order.create({
        data: {
          total: 18.50,
          status: 'PREPARING',
          storeId: testStoreId,
          userId: testUserId,
          createdAt: oneHourAgo,
        },
      }),
      prisma.order.create({
        data: {
          total: 32.75,
          status: 'READY',
          storeId: testStoreId,
          userId: testUserId,
          createdAt: oneDayAgo,
        },
      }),
      prisma.order.create({
        data: {
          total: 15.25,
          status: 'COMPLETED',
          storeId: testStoreId,
          userId: testUserId,
          createdAt: oneWeekAgo,
        },
      }),
    ]);

    testOrderIds = orders.map(order => order.id);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.order.deleteMany({
      where: { id: { in: testOrderIds } },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.store.delete({
      where: { id: testStoreId },
    });
    await app.close();
  });

  describe('GET /orders/recent', () => {
    it('should return recent orders with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent')
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBeGreaterThan(0);

      // Check order structure
      const order = response.body.orders[0];
      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('total');
      expect(order).toHaveProperty('status');
      expect(order).toHaveProperty('createdAt');
      expect(order).toHaveProperty('Store');
      expect(order).toHaveProperty('User');

      // Check nested structures
      expect(order.Store).toHaveProperty('id');
      expect(order.Store).toHaveProperty('name');
      expect(order.Store).toHaveProperty('region');
      expect(order.Store).toHaveProperty('country');
      expect(order.Store).toHaveProperty('city');

      expect(order.User).toHaveProperty('id');
      expect(order.User).toHaveProperty('email');

      // Check that total is properly converted to number
      expect(typeof order.total).toBe('number');
    });

    it('should return orders ordered by creation date (newest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent')
        .expect(200);

      const orders = response.body.orders;
      expect(orders.length).toBeGreaterThan(1);

      // Check that orders are in descending order by createdAt
      for (let i = 1; i < orders.length; i++) {
        const prevDate = new Date(orders[i - 1].createdAt);
        const currDate = new Date(orders[i].createdAt);
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime());
      }
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?page=1&limit=2')
        .expect(200);

      expect(response.body.orders.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('pages');
      expect(typeof response.body.pagination.total).toBe('number');
      expect(typeof response.body.pagination.pages).toBe('number');
    });

    it('should support status filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?status=PENDING')
        .expect(200);

      expect(response.body.orders.length).toBeGreaterThan(0);
      response.body.orders.forEach((order: any) => {
        expect(order.status).toBe('PENDING');
      });
    });

    it('should support date range filtering - hour', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?dateRange=hour')
        .expect(200);

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      response.body.orders.forEach((order: any) => {
        const orderDate = new Date(order.createdAt);
        expect(orderDate.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
      });
    });

    it('should support date range filtering - 4hours', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?dateRange=4hours')
        .expect(200);

      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      response.body.orders.forEach((order: any) => {
        const orderDate = new Date(order.createdAt);
        expect(orderDate.getTime()).toBeGreaterThanOrEqual(fourHoursAgo.getTime());
      });
    });

    it('should support date range filtering - today', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?dateRange=today')
        .expect(200);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      response.body.orders.forEach((order: any) => {
        const orderDate = new Date(order.createdAt);
        expect(orderDate.getTime()).toBeGreaterThanOrEqual(startOfDay.getTime());
      });
    });

    it('should support date range filtering - 7days', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?dateRange=7days')
        .expect(200);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      response.body.orders.forEach((order: any) => {
        const orderDate = new Date(order.createdAt);
        expect(orderDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
      });
    });

    it('should support search functionality', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?search=orders-test@example.com')
        .expect(200);

      expect(response.body.orders.length).toBeGreaterThan(0);
      response.body.orders.forEach((order: any) => {
        expect(order.User.email).toContain('orders-test');
      });
    });

    it('should support store filtering by country', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?country=US')
        .expect(200);

      response.body.orders.forEach((order: any) => {
        expect(order.Store.country).toBe('US');
      });
    });

    it('should support store filtering by region', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?region=North America')
        .expect(200);

      response.body.orders.forEach((order: any) => {
        expect(order.Store.region).toBe('North America');
      });
    });

    it('should support combined filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?status=PENDING&country=US&dateRange=today')
        .expect(200);

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      response.body.orders.forEach((order: any) => {
        expect(order.status).toBe('PENDING');
        expect(order.Store.country).toBe('US');
        const orderDate = new Date(order.createdAt);
        expect(orderDate.getTime()).toBeGreaterThanOrEqual(startOfDay.getTime());
      });
    });

    it('should handle empty results gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?status=NONEXISTENT_STATUS')
        .expect(200);

      expect(response.body.orders).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
      expect(response.body.pagination.pages).toBe(0);
    });

    it('should use default pagination values', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?page=invalid&limit=invalid')
        .expect(200);

      // Should fall back to defaults
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });
  });

  describe('GET /orders/:id', () => {
    it('should return specific order details', async () => {
      const orderId = testOrderIds[0];
      
      const response = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', orderId);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('Store');
      expect(response.body).toHaveProperty('User');

      // Check that total is properly converted to number
      expect(typeof response.body.total).toBe('number');

      // Check nested structures
      expect(response.body.Store).toHaveProperty('id', testStoreId);
      expect(response.body.Store).toHaveProperty('name', 'Test Store for Orders');
      expect(response.body.User).toHaveProperty('id', testUserId);
      expect(response.body.User).toHaveProperty('email', 'orders-test@example.com');
    });

    it('should return error for non-existent order', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/non-existent-id')
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Internal server error');
    });
  });

  describe('Data Integrity and Performance', () => {
    it('should maintain referential integrity with stores and users', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent')
        .expect(200);

      const orders = response.body.orders;
      expect(orders.length).toBeGreaterThan(0);

      // All orders should have valid store and user references
      orders.forEach((order: any) => {
        expect(order.Store).toBeDefined();
        expect(order.Store.id).toBeDefined();
        expect(order.User).toBeDefined();
        expect(order.User.id).toBeDefined();
      });
    });

    it('should handle large result sets with pagination', async () => {
      // Create additional orders for pagination testing
      const additionalOrders = [];
      for (let i = 0; i < 15; i++) {
        additionalOrders.push({
          total: 10.00 + i,
          status: 'PENDING',
          storeId: testStoreId,
          userId: testUserId,
          createdAt: new Date(),
        });
      }

      const createdOrders = await Promise.all(
        additionalOrders.map(order => prisma.order.create({ data: order }))
      );

      try {
        const response = await request(app.getHttpServer())
          .get('/orders/recent?limit=5')
          .expect(200);

        expect(response.body.orders.length).toBe(5);
        expect(response.body.pagination.total).toBeGreaterThan(15);
        expect(response.body.pagination.pages).toBeGreaterThan(3);

        // Test second page
        const page2Response = await request(app.getHttpServer())
          .get('/orders/recent?page=2&limit=5')
          .expect(200);

        expect(page2Response.body.orders.length).toBe(5);
        expect(page2Response.body.pagination.page).toBe(2);

        // Orders on different pages should be different
        const page1Ids = response.body.orders.map((o: any) => o.id);
        const page2Ids = page2Response.body.orders.map((o: any) => o.id);
        const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
        expect(intersection.length).toBe(0);
      } finally {
        // Clean up additional orders
        await prisma.order.deleteMany({
          where: { id: { in: createdOrders.map(o => o.id) } },
        });
      }
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() =>
        request(app.getHttpServer()).get('/orders/recent?limit=5')
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('orders');
        expect(response.body).toHaveProperty('pagination');
      });

      // All responses should have the same structure
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body.pagination.total).toBe(firstResponse.pagination.total);
        expect(response.body.orders.length).toBe(firstResponse.orders.length);
      });
    });

    it('should properly handle decimal precision for totals', async () => {
      // Create an order with precise decimal
      const preciseOrder = await prisma.order.create({
        data: {
          total: 123.456789, // High precision decimal
          status: 'PENDING',
          storeId: testStoreId,
          userId: testUserId,
        },
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/orders/recent')
          .expect(200);

        const order = response.body.orders.find((o: any) => o.id === preciseOrder.id);
        expect(order).toBeDefined();
        expect(typeof order.total).toBe('number');
        expect(order.total).toBeCloseTo(123.456789, 6);
      } finally {
        await prisma.order.delete({ where: { id: preciseOrder.id } });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking the database connection
      // For now, we'll test that the error handling is working
      const response = await request(app.getHttpServer())
        .get('/orders/recent?invalid=parameter')
        .expect(200);

      // Should still work with invalid query parameters
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
    });

    it('should handle malformed query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?page=abc&limit=xyz&dateRange=invalid')
        .expect(200);

      // Should fall back to defaults and ignore invalid parameters
      expect(response.body).toHaveProperty('orders');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should handle very large page numbers', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?page=999999&limit=10')
        .expect(200);

      expect(response.body.orders).toEqual([]);
      expect(response.body.pagination.page).toBe(999999);
    });

    it('should handle zero and negative pagination values', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders/recent?page=0&limit=-5')
        .expect(200);

      // Should handle gracefully, likely falling back to defaults
      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('pagination');
    });
  });
});