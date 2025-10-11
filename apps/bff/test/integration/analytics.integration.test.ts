import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Analytics API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testStoreIds: string[] = [];
  let testUserIds: string[] = [];
  let testCategoryIds: string[] = [];
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

    // Create test data for analytics
    await setupAnalyticsTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupAnalyticsTestData();
    await app.close();
  });

  async function setupAnalyticsTestData() {
    // Create test stores in different regions
    const stores = await Promise.all([
      prisma.store.create({
        data: {
          name: 'Analytics Store US East',
          country: 'US',
          region: 'North America',
          city: 'New York',
        },
      }),
      prisma.store.create({
        data: {
          name: 'Analytics Store US West',
          country: 'US',
          region: 'North America',
          city: 'Los Angeles',
        },
      }),
      prisma.store.create({
        data: {
          name: 'Analytics Store UK',
          country: 'UK',
          region: 'Europe',
          city: 'London',
        },
      }),
    ]);
    testStoreIds = stores.map(s => s.id);

    // Create test users
    const users = await Promise.all([
      prisma.user.create({
        data: {
          email: 'analytics-user1@example.com',
          role: 'STAFF',
          firstName: 'Analytics',
          lastName: 'User1',
          active: true,
        },
      }),
      prisma.user.create({
        data: {
          email: 'analytics-user2@example.com',
          role: 'MANAGER',
          firstName: 'Analytics',
          lastName: 'User2',
          active: true,
        },
      }),
    ]);
    testUserIds = users.map(u => u.id);

    // Create test categories
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'Analytics Category Sandwiches',
          description: 'Sandwich category for analytics',
          active: true,
        },
      }),
      prisma.category.create({
        data: {
          name: 'Analytics Category Drinks',
          description: 'Drinks category for analytics',
          active: true,
        },
      }),
    ]);
    testCategoryIds = categories.map(c => c.id);

    // Create menu items for each store and category
    const menuItems = [];
    for (const storeId of testStoreIds) {
      for (let i = 0; i < testCategoryIds.length; i++) {
        const item = await prisma.menuItem.create({
          data: {
            name: `Analytics Item ${i + 1} - Store ${storeId.slice(-4)}`,
            price: 10.99 + i,
            basePrice: 9.99 + i,
            storeId: storeId,
            active: true,
          },
        });
        menuItems.push(item);

        // Assign item to category
        await prisma.menuItemCategory.create({
          data: {
            menuItemId: item.id,
            categoryId: testCategoryIds[i],
          },
        });
      }
    }

    // Create orders with different dates and amounts for time-series data
    const now = new Date();
    const dates = [
      new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      now, // today
    ];

    const orders = [];
    for (let i = 0; i < dates.length; i++) {
      for (let j = 0; j < testStoreIds.length; j++) {
        // Create multiple orders per day per store
        for (let k = 0; k < 3; k++) {
          const order = await prisma.order.create({
            data: {
              total: 25.99 + (i * 5) + (j * 2) + k, // Varying amounts
              status: ['PENDING', 'PREPARING', 'READY', 'COMPLETED'][k % 4],
              storeId: testStoreIds[j],
              userId: testUserIds[j % testUserIds.length],
              createdAt: new Date(dates[i].getTime() + (k * 60 * 60 * 1000)), // Spread throughout the day
            },
          });
          orders.push(order);
        }
      }
    }
    testOrderIds = orders.map(o => o.id);
  }

  async function cleanupAnalyticsTestData() {
    await prisma.order.deleteMany({
      where: { id: { in: testOrderIds } },
    });
    await prisma.menuItemCategory.deleteMany({
      where: { categoryId: { in: testCategoryIds } },
    });
    await prisma.menuItem.deleteMany({
      where: { storeId: { in: testStoreIds } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: testCategoryIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: testUserIds } },
    });
    await prisma.store.deleteMany({
      where: { id: { in: testStoreIds } },
    });
  }

  describe('GET /analytics/kpis', () => {
    it('should return key performance indicators with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/kpis')
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('activeStores');

      // Check data types
      expect(typeof response.body.totalOrders).toBe('number');
      expect(typeof response.body.totalRevenue).toBe('number');
      expect(typeof response.body.averageOrderValue).toBe('number');
      expect(typeof response.body.activeStores).toBe('number');

      // Verify reasonable values
      expect(response.body.totalOrders).toBeGreaterThan(0);
      expect(response.body.totalRevenue).toBeGreaterThan(0);
      expect(response.body.averageOrderValue).toBeGreaterThan(0);
      expect(response.body.activeStores).toBeGreaterThan(0);
    });

    it('should support date range filtering for KPIs', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const response = await request(app.getHttpServer())
        .get(`/analytics/kpis?startDate=${sevenDaysAgo.toISOString()}&endDate=${now.toISOString()}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('activeStores');

      // Values should be positive
      expect(response.body.totalOrders).toBeGreaterThan(0);
      expect(response.body.totalRevenue).toBeGreaterThan(0);
    });

    it('should support region filtering for KPIs', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/kpis?region=North America')
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('activeStores');

      // Should have data from North American stores
      expect(response.body.totalOrders).toBeGreaterThan(0);
    });

    it('should support country filtering for KPIs', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/kpis?country=US')
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('averageOrderValue');
      expect(response.body).toHaveProperty('activeStores');

      // Should have data from US stores only
      expect(response.body.totalOrders).toBeGreaterThan(0);
    });
  });

  describe('GET /analytics/time-series', () => {
    it('should return time-series data with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=orders&period=daily')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Check data point structure
      const dataPoint = response.body[0];
      expect(dataPoint).toHaveProperty('date');
      expect(dataPoint).toHaveProperty('value');
      expect(typeof dataPoint.value).toBe('number');

      // Verify date format
      expect(new Date(dataPoint.date)).toBeInstanceOf(Date);
      expect(isNaN(new Date(dataPoint.date).getTime())).toBe(false);
    });

    it('should support revenue metric', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=revenue&period=daily')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const dataPoint = response.body[0];
      expect(dataPoint).toHaveProperty('date');
      expect(dataPoint).toHaveProperty('value');
      expect(typeof dataPoint.value).toBe('number');
      expect(dataPoint.value).toBeGreaterThanOrEqual(0);
    });

    it('should support hourly period', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=orders&period=hourly')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const dataPoint = response.body[0];
        expect(dataPoint).toHaveProperty('date');
        expect(dataPoint).toHaveProperty('value');
      }
    });

    it('should support weekly period', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=orders&period=weekly')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 0) {
        const dataPoint = response.body[0];
        expect(dataPoint).toHaveProperty('date');
        expect(dataPoint).toHaveProperty('value');
      }
    });

    it('should support date range filtering', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const response = await request(app.getHttpServer())
        .get(`/analytics/time-series?metric=orders&period=daily&startDate=${sevenDaysAgo.toISOString()}&endDate=${now.toISOString()}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All data points should be within the specified range
      response.body.forEach((dataPoint: any) => {
        const pointDate = new Date(dataPoint.date);
        expect(pointDate.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
        expect(pointDate.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should support region filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=orders&period=daily&region=Europe')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should return data (even if zero for some periods)
    });

    it('should return data in chronological order', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=orders&period=daily')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 1) {
        for (let i = 1; i < response.body.length; i++) {
          const prevDate = new Date(response.body[i - 1].date);
          const currDate = new Date(response.body[i].date);
          expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
        }
      }
    });
  });

  describe('GET /analytics/breakdowns', () => {
    it('should return store breakdown with proper structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/breakdowns?dimension=store')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const breakdown = response.body[0];
      expect(breakdown).toHaveProperty('name');
      expect(breakdown).toHaveProperty('orders');
      expect(breakdown).toHaveProperty('revenue');
      expect(typeof breakdown.orders).toBe('number');
      expect(typeof breakdown.revenue).toBe('number');
      expect(breakdown.orders).toBeGreaterThanOrEqual(0);
      expect(breakdown.revenue).toBeGreaterThanOrEqual(0);
    });

    it('should return region breakdown', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/breakdowns?dimension=region')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const breakdown = response.body[0];
      expect(breakdown).toHaveProperty('name');
      expect(breakdown).toHaveProperty('orders');
      expect(breakdown).toHaveProperty('revenue');

      // Should have both North America and Europe
      const regions = response.body.map((b: any) => b.name);
      expect(regions).toContain('North America');
      expect(regions).toContain('Europe');
    });

    it('should return category breakdown', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/breakdowns?dimension=category')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const breakdown = response.body[0];
      expect(breakdown).toHaveProperty('name');
      expect(breakdown).toHaveProperty('orders');
      expect(breakdown).toHaveProperty('revenue');

      // Should have our test categories
      const categories = response.body.map((b: any) => b.name);
      expect(categories).toContain('Analytics Category Sandwiches');
      expect(categories).toContain('Analytics Category Drinks');
    });

    it('should support date range filtering for breakdowns', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const response = await request(app.getHttpServer())
        .get(`/analytics/breakdowns?dimension=store&startDate=${sevenDaysAgo.toISOString()}&endDate=${now.toISOString()}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const breakdown = response.body[0];
      expect(breakdown).toHaveProperty('name');
      expect(breakdown).toHaveProperty('orders');
      expect(breakdown).toHaveProperty('revenue');
    });

    it('should support region filtering for breakdowns', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/breakdowns?dimension=store&region=North America')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      // All stores should be from North America
      response.body.forEach((breakdown: any) => {
        // The store names should contain our North American test stores
        expect(['Analytics Store US East', 'Analytics Store US West']).toContain(breakdown.name);
      });
    });

    it('should return breakdowns ordered by revenue (descending)', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/breakdowns?dimension=store')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      
      if (response.body.length > 1) {
        for (let i = 1; i < response.body.length; i++) {
          expect(response.body[i - 1].revenue).toBeGreaterThanOrEqual(response.body[i].revenue);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid metric parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=invalid&period=daily')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid period parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/time-series?metric=orders&period=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid dimension parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/breakdowns?dimension=invalid')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid date formats', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/kpis?startDate=invalid-date&endDate=also-invalid')
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle future date ranges gracefully', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const moreFutureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .get(`/analytics/kpis?startDate=${futureDate.toISOString()}&endDate=${moreFutureDate.toISOString()}`)
        .expect(200);

      // Should return zero values for future dates
      expect(response.body.totalOrders).toBe(0);
      expect(response.body.totalRevenue).toBe(0);
      expect(response.body.averageOrderValue).toBe(0);
    });

    it('should handle empty result sets gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/breakdowns?dimension=store&country=NONEXISTENT')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should handle very large date ranges', async () => {
      const veryOldDate = new Date('2020-01-01');
      const now = new Date();

      const response = await request(app.getHttpServer())
        .get(`/analytics/time-series?metric=orders&period=daily&startDate=${veryOldDate.toISOString()}&endDate=${now.toISOString()}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should handle large ranges without timing out
    });
  });

  describe('Data Accuracy and Consistency', () => {
    it('should maintain consistency between KPIs and time-series data', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const [kpisResponse, timeSeriesResponse] = await Promise.all([
        request(app.getHttpServer())
          .get(`/analytics/kpis?startDate=${sevenDaysAgo.toISOString()}&endDate=${now.toISOString()}`)
          .expect(200),
        request(app.getHttpServer())
          .get(`/analytics/time-series?metric=orders&period=daily&startDate=${sevenDaysAgo.toISOString()}&endDate=${now.toISOString()}`)
          .expect(200),
      ]);

      const totalOrdersFromKpis = kpisResponse.body.totalOrders;
      const totalOrdersFromTimeSeries = timeSeriesResponse.body.reduce(
        (sum: number, point: any) => sum + point.value,
        0
      );

      // Should be approximately equal (allowing for minor rounding differences)
      expect(Math.abs(totalOrdersFromKpis - totalOrdersFromTimeSeries)).toBeLessThan(1);
    });

    it('should maintain consistency between breakdowns and KPIs', async () => {
      const [kpisResponse, storeBreakdownResponse] = await Promise.all([
        request(app.getHttpServer()).get('/analytics/kpis').expect(200),
        request(app.getHttpServer()).get('/analytics/breakdowns?dimension=store').expect(200),
      ]);

      const totalRevenueFromKpis = kpisResponse.body.totalRevenue;
      const totalRevenueFromBreakdown = storeBreakdownResponse.body.reduce(
        (sum: number, store: any) => sum + store.revenue,
        0
      );

      // Should be approximately equal
      expect(Math.abs(totalRevenueFromKpis - totalRevenueFromBreakdown)).toBeLessThan(0.01);
    });

    it('should handle decimal precision correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/kpis')
        .expect(200);

      // Revenue and average order value should be properly formatted decimals
      expect(typeof response.body.totalRevenue).toBe('number');
      expect(typeof response.body.averageOrderValue).toBe('number');
      expect(response.body.totalRevenue).toBeGreaterThan(0);
      expect(response.body.averageOrderValue).toBeGreaterThan(0);

      // Should not have excessive decimal places in the response
      const revenueStr = response.body.totalRevenue.toString();
      const decimalPlaces = revenueStr.includes('.') ? revenueStr.split('.')[1].length : 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });
});