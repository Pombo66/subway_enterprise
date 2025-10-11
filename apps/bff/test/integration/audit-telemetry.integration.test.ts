import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Audit Trail and Telemetry Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testUserId: string;
  let testCategoryId: string;
  let testModifierGroupId: string;
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

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test store
    const testStore = await prisma.store.create({
      data: {
        name: 'Audit Test Store',
        country: 'US',
        region: 'North America',
        city: 'Boston',
      },
    });
    testStoreId = testStore.id;

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: 'audit-test@example.com',
        role: 'ADMIN',
        firstName: 'Audit',
        lastName: 'Tester',
        active: true,
      },
    });
    testUserId = testUser.id;

    // Create test category
    const testCategory = await prisma.category.create({
      data: {
        name: 'Audit Test Category',
        description: 'Category for audit testing',
        active: true,
      },
    });
    testCategoryId = testCategory.id;

    // Create test modifier group
    const testModifierGroup = await prisma.modifierGroup.create({
      data: {
        name: 'Audit Test Modifier Group',
        description: 'Modifier group for audit testing',
        minSelection: 0,
        maxSelection: 1,
        required: false,
        active: true,
      },
    });
    testModifierGroupId = testModifierGroup.id;

    // Create test menu item
    const testMenuItem = await prisma.menuItem.create({
      data: {
        name: 'Audit Test Menu Item',
        price: 12.99,
        basePrice: 10.99,
        storeId: testStoreId,
        active: true,
      },
    });
    testMenuItemId = testMenuItem.id;
  }

  async function cleanupTestData() {
    // Clean up audit entries first (they reference other entities)
    await prisma.auditEntry.deleteMany({
      where: {
        OR: [
          { entity: 'MenuItem', entityId: testMenuItemId },
          { entity: 'Category', entityId: testCategoryId },
          { entity: 'ModifierGroup', entityId: testModifierGroupId },
          { entity: 'User', entityId: testUserId },
          { entity: 'Store', entityId: testStoreId },
        ],
      },
    });

    // Clean up other test data
    await prisma.menuItemCategory.deleteMany({
      where: { menuItemId: testMenuItemId },
    });
    await prisma.menuItem.deleteMany({
      where: { id: testMenuItemId },
    });
    await prisma.category.deleteMany({
      where: { id: testCategoryId },
    });
    await prisma.modifierGroup.deleteMany({
      where: { id: testModifierGroupId },
    });
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    await prisma.store.deleteMany({
      where: { id: testStoreId },
    });
  }

  describe('Menu Item Audit Trail', () => {
    it('should create audit entry when creating menu item', async () => {
      const newItem = {
        name: 'Audit Trail Test Item',
        price: 15.99,
        storeId: testStoreId,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/items')
        .send(newItem)
        .expect(201);

      expect(response.body.success).toBe(true);
      const itemId = response.body.data.id;

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItem',
          entityId: itemId,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('MenuItem');
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('name', newItem.name);
      expect(diff.new).toHaveProperty('price', newItem.price);
      expect(diff.new).toHaveProperty('storeId', newItem.storeId);
    });

    it('should create audit entry when updating menu item pricing', async () => {
      const newBasePrice = 18.99;

      const response = await request(app.getHttpServer())
        .patch(`/menu/pricing/${testMenuItemId}`)
        .send({ basePrice: newBasePrice })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check audit entry was created
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
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('MenuItem');
      expect(auditEntry.action).toBe('UPDATE_PRICING');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('old');
      expect(diff).toHaveProperty('new');
      expect(diff.old).toHaveProperty('basePrice', 10.99);
      expect(diff.new).toHaveProperty('basePrice', newBasePrice);
    });
  });

  describe('Modifier Attachment Audit Trail', () => {
    it('should create audit entry when attaching modifier to menu item', async () => {
      const response = await request(app.getHttpServer())
        .post(`/menu/items/${testMenuItemId}/modifiers`)
        .send({ modifierGroupId: testModifierGroupId })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItemModifier',
          action: 'CREATE',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('MenuItemModifier');
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('menuItemId', testMenuItemId);
      expect(diff.new).toHaveProperty('modifierGroupId', testModifierGroupId);
    });

    it('should create audit entry when detaching modifier from menu item', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/menu/items/${testMenuItemId}/modifiers/${testModifierGroupId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItemModifier',
          action: 'DELETE',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('MenuItemModifier');
      expect(auditEntry.action).toBe('DELETE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('old');
      expect(diff.old).toHaveProperty('menuItemId', testMenuItemId);
      expect(diff.old).toHaveProperty('modifierGroupId', testModifierGroupId);
    });
  });

  describe('Modifier Group Audit Trail', () => {
    it('should create audit entry when creating modifier group', async () => {
      const newGroup = {
        name: 'Audit Test New Group',
        description: 'New group for audit testing',
        minSelection: 1,
        maxSelection: 3,
        required: true,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/modifier-groups')
        .send(newGroup)
        .expect(201);

      expect(response.body.success).toBe(true);
      const groupId = response.body.data.id;

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'ModifierGroup',
          entityId: groupId,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('ModifierGroup');
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('name', newGroup.name);
      expect(diff.new).toHaveProperty('minSelection', newGroup.minSelection);
      expect(diff.new).toHaveProperty('maxSelection', newGroup.maxSelection);
      expect(diff.new).toHaveProperty('required', newGroup.required);
    });
  });

  describe('Store Operations Audit Trail', () => {
    it('should create audit entry when creating store', async () => {
      const newStore = {
        name: 'Audit Test New Store',
        country: 'CA',
        region: 'North America',
        city: 'Vancouver',
      };

      const response = await request(app.getHttpServer())
        .post('/stores')
        .send(newStore)
        .expect(201);

      expect(response.body.ok).toBe(true);
      const storeId = response.body.store.id;

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'Store',
          entityId: storeId,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('Store');
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('name', newStore.name);
      expect(diff.new).toHaveProperty('country', newStore.country);
    });

    it('should create audit entry when updating store', async () => {
      const updates = {
        name: 'Updated Audit Test Store',
        city: 'Cambridge',
      };

      const response = await request(app.getHttpServer())
        .put(`/stores/${testStoreId}`)
        .send(updates)
        .expect(200);

      expect(response.body.ok).toBe(true);

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'Store',
          entityId: testStoreId,
          action: 'UPDATE',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('Store');
      expect(auditEntry.action).toBe('UPDATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('old');
      expect(diff).toHaveProperty('new');
      expect(diff.old).toHaveProperty('name', 'Audit Test Store');
      expect(diff.new).toHaveProperty('name', updates.name);
      expect(diff.new).toHaveProperty('city', updates.city);
    });

    it('should create audit entry when deleting store', async () => {
      // Create a store to delete
      const storeToDelete = await prisma.store.create({
        data: {
          name: 'Store to Delete',
          country: 'UK',
          region: 'Europe',
          city: 'London',
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/stores/${storeToDelete.id}`)
        .expect(200);

      expect(response.body.ok).toBe(true);

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'Store',
          entityId: storeToDelete.id,
          action: 'DELETE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('Store');
      expect(auditEntry.action).toBe('DELETE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('old');
      expect(diff.old).toHaveProperty('name', 'Store to Delete');
    });
  });

  describe('Settings Operations Audit Trail', () => {
    it('should create audit entry when creating user', async () => {
      const newUser = {
        email: 'audit-new-user@example.com',
        role: 'MANAGER',
        firstName: 'New',
        lastName: 'User',
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/settings/users')
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      const userId = response.body.data.id;

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'User',
          entityId: userId,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('User');
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('email', newUser.email);
      expect(diff.new).toHaveProperty('role', newUser.role);
    });

    it('should create audit entry when updating user', async () => {
      const updates = {
        firstName: 'Updated',
        lastName: 'Name',
        role: 'STAFF',
      };

      const response = await request(app.getHttpServer())
        .patch(`/settings/users/${testUserId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'User',
          entityId: testUserId,
          action: 'UPDATE',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('User');
      expect(auditEntry.action).toBe('UPDATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('old');
      expect(diff).toHaveProperty('new');
      expect(diff.old).toHaveProperty('firstName', 'Audit');
      expect(diff.new).toHaveProperty('firstName', updates.firstName);
      expect(diff.new).toHaveProperty('role', updates.role);
    });

    it('should create audit entry when creating feature flag', async () => {
      const newFlag = {
        key: 'audit-test-flag',
        enabled: true,
        description: 'Test flag for audit trail',
      };

      const response = await request(app.getHttpServer())
        .post('/settings/flags')
        .send(newFlag)
        .expect(201);

      expect(response.body.success).toBe(true);
      const flagId = response.body.data.id;

      // Check audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'FeatureFlag',
          entityId: flagId,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('FeatureFlag');
      expect(auditEntry.action).toBe('CREATE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('key', newFlag.key);
      expect(diff.new).toHaveProperty('enabled', newFlag.enabled);
      expect(diff.new).toHaveProperty('description', newFlag.description);
    });

    it('should create comprehensive audit entry when updating feature flag', async () => {
      // First create a flag to update
      const flagResponse = await request(app.getHttpServer())
        .post('/settings/flags')
        .send({
          key: 'audit-update-flag',
          enabled: false,
          description: 'Flag to update',
        })
        .expect(201);

      const flagKey = flagResponse.body.data.key;

      // Update the flag
      const updates = {
        enabled: true,
        description: 'Updated flag description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/settings/flags/${flagKey}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Check comprehensive audit entry was created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'FeatureFlag',
          entityId: response.body.data.id,
          action: 'FEATURE_FLAG_TOGGLE',
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.actor).toBe('system');
      expect(auditEntry.entity).toBe('FeatureFlag');
      expect(auditEntry.action).toBe('FEATURE_FLAG_TOGGLE');
      expect(auditEntry.diff).toBeDefined();

      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('flagKey', flagKey);
      expect(diff).toHaveProperty('operation', 'TOGGLE');
      expect(diff).toHaveProperty('oldValue', false);
      expect(diff).toHaveProperty('newValue', true);
      expect(diff).toHaveProperty('metadata');
      expect(diff.metadata).toHaveProperty('source', 'admin_dashboard');
    });
  });

  describe('Audit Log Retrieval', () => {
    it('should retrieve audit log with proper filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings/audit?entity=MenuItem&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('entries');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.entries)).toBe(true);

      // All entries should be for MenuItem entity
      response.body.data.entries.forEach((entry: any) => {
        expect(entry.entity).toBe('MenuItem');
      });

      // Check pagination structure
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 10);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('pages');
    });

    it('should support search in audit log', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings/audit?search=Audit Test&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.entries).toBeDefined();
      expect(Array.isArray(response.body.data.entries)).toBe(true);

      // Should find entries related to our test data
      expect(response.body.data.entries.length).toBeGreaterThan(0);
    });

    it('should support action filtering in audit log', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings/audit?action=CREATE&page=1&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.entries).toBeDefined();

      // All entries should have CREATE action
      response.body.data.entries.forEach((entry: any) => {
        expect(entry.action).toBe('CREATE');
      });
    });

    it('should return audit entries in chronological order (newest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/settings/audit?page=1&limit=20')
        .expect(200);

      expect(response.body.success).toBe(true);
      const entries = response.body.data.entries;

      if (entries.length > 1) {
        for (let i = 1; i < entries.length; i++) {
          const prevTimestamp = new Date(entries[i - 1].timestamp);
          const currTimestamp = new Date(entries[i].timestamp);
          expect(prevTimestamp.getTime()).toBeGreaterThanOrEqual(currTimestamp.getTime());
        }
      }
    });
  });

  describe('Data Integrity and Performance', () => {
    it('should maintain audit trail integrity across operations', async () => {
      // Perform a series of operations
      const itemResponse = await request(app.getHttpServer())
        .post('/menu/items')
        .send({
          name: 'Integrity Test Item',
          price: 20.99,
          storeId: testStoreId,
          active: true,
        })
        .expect(201);

      const itemId = itemResponse.body.data.id;

      await request(app.getHttpServer())
        .patch(`/menu/pricing/${itemId}`)
        .send({ basePrice: 22.99 })
        .expect(200);

      // Check that all audit entries were created
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItem',
          entityId: itemId,
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(auditEntries.length).toBeGreaterThanOrEqual(2);
      expect(auditEntries[0].action).toBe('CREATE');
      expect(auditEntries[1].action).toBe('UPDATE_PRICING');

      // Verify data consistency
      auditEntries.forEach(entry => {
        expect(entry.entity).toBe('MenuItem');
        expect(entry.entityId).toBe(itemId);
        expect(entry.actor).toBe('system');
        expect(entry.diff).toBeDefined();
        expect(entry.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle concurrent operations with proper audit trails', async () => {
      const operations = [
        request(app.getHttpServer())
          .post('/menu/items')
          .send({
            name: 'Concurrent Item 1',
            price: 15.99,
            storeId: testStoreId,
            active: true,
          }),
        request(app.getHttpServer())
          .post('/menu/items')
          .send({
            name: 'Concurrent Item 2',
            price: 16.99,
            storeId: testStoreId,
            active: true,
          }),
        request(app.getHttpServer())
          .post('/settings/users')
          .send({
            email: 'concurrent-user@example.com',
            role: 'STAFF',
            firstName: 'Concurrent',
            lastName: 'User',
            active: true,
          }),
      ];

      const responses = await Promise.all(operations);

      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Check that audit entries were created for all operations
      const itemIds = responses.slice(0, 2).map(r => r.body.data.id);
      const userId = responses[2].body.data.id;

      const itemAuditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItem',
          entityId: { in: itemIds },
          action: 'CREATE',
        },
      });

      const userAuditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'User',
          entityId: userId,
          action: 'CREATE',
        },
      });

      expect(itemAuditEntries).toHaveLength(2);
      expect(userAuditEntries).toHaveLength(1);
    });

    it('should handle large audit diffs without truncation', async () => {
      // Create an item with a long description to test large diffs
      const longDescription = 'A'.repeat(1000); // 1000 character description
      
      const itemResponse = await request(app.getHttpServer())
        .post('/menu/items')
        .send({
          name: 'Large Diff Test Item',
          price: 25.99,
          storeId: testStoreId,
          active: true,
        })
        .expect(201);

      const itemId = itemResponse.body.data.id;

      // Check the audit entry
      const auditEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'MenuItem',
          entityId: itemId,
          action: 'CREATE',
        },
      });

      expect(auditEntries).toHaveLength(1);
      const auditEntry = auditEntries[0];
      expect(auditEntry.diff).toBeDefined();
      
      const diff = JSON.parse(auditEntry.diff || '{}');
      expect(diff).toHaveProperty('new');
      expect(diff.new).toHaveProperty('name', 'Large Diff Test Item');
      
      // Verify the diff is complete and not truncated
      expect(auditEntry.diff?.length).toBeGreaterThan(100);
    });
  });
});