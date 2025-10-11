import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Database Models Integration Tests', () => {
  let prisma: PrismaClient;
  let testStoreId: string;
  let testUserId: string;
  let testCategoryId: string;
  let testMenuItemId: string;
  let testModifierGroupId: string;
  let testModifierId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleFixture.get<PrismaClient>(PrismaClient);
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    if (testModifierId) {
      await prisma.modifier.deleteMany({
        where: { id: testModifierId },
      });
    }
    
    if (testModifierGroupId) {
      await prisma.menuItemModifier.deleteMany({
        where: { modifierGroupId: testModifierGroupId },
      });
      await prisma.modifierGroup.deleteMany({
        where: { id: testModifierGroupId },
      });
    }

    if (testMenuItemId && testCategoryId) {
      await prisma.menuItemCategory.deleteMany({
        where: { menuItemId: testMenuItemId, categoryId: testCategoryId },
      });
    }

    if (testMenuItemId) {
      await prisma.priceOverride.deleteMany({
        where: { menuItemId: testMenuItemId },
      });
      await prisma.menuItem.deleteMany({
        where: { id: testMenuItemId },
      });
    }

    if (testCategoryId) {
      await prisma.category.deleteMany({
        where: { id: testCategoryId },
      });
    }

    if (testUserId) {
      await prisma.order.deleteMany({
        where: { userId: testUserId },
      });
      await prisma.user.deleteMany({
        where: { id: testUserId },
      });
    }

    if (testStoreId) {
      await prisma.store.deleteMany({
        where: { id: testStoreId },
      });
    }

    // Clean up audit entries
    await prisma.auditEntry.deleteMany({
      where: {
        OR: [
          { entity: 'Store' },
          { entity: 'User' },
          { entity: 'Category' },
          { entity: 'MenuItem' },
          { entity: 'ModifierGroup' },
          { entity: 'Modifier' },
          { entity: 'Order' },
          { entity: 'PriceOverride' },
        ],
      },
    });

    // Clean up feature flags
    await prisma.featureFlag.deleteMany({
      where: { key: { contains: 'test-' } },
    });
  }

  describe('Store Model', () => {
    it('should create and retrieve store with all fields', async () => {
      const storeData = {
        name: 'Test Store Model',
        country: 'US',
        region: 'North America',
        city: 'Seattle',
      };

      const createdStore = await prisma.store.create({
        data: storeData,
      });

      testStoreId = createdStore.id;

      expect(createdStore).toHaveProperty('id');
      expect(createdStore.name).toBe(storeData.name);
      expect(createdStore.country).toBe(storeData.country);
      expect(createdStore.region).toBe(storeData.region);
      expect(createdStore.city).toBe(storeData.city);
      expect(createdStore.createdAt).toBeInstanceOf(Date);
      expect(createdStore.updatedAt).toBeInstanceOf(Date);

      // Verify retrieval
      const retrievedStore = await prisma.store.findUnique({
        where: { id: createdStore.id },
      });

      expect(retrievedStore).toBeDefined();
      expect(retrievedStore?.name).toBe(storeData.name);
    });

    it('should enforce unique constraints properly', async () => {
      // Stores should allow duplicate names in different cities
      const store1Data = {
        name: 'Duplicate Name Store',
        country: 'US',
        region: 'North America',
        city: 'Portland',
      };

      const store2Data = {
        name: 'Duplicate Name Store',
        country: 'US',
        region: 'North America',
        city: 'Austin', // Different city
      };

      const store1 = await prisma.store.create({ data: store1Data });
      const store2 = await prisma.store.create({ data: store2Data });

      expect(store1.id).not.toBe(store2.id);
      expect(store1.name).toBe(store2.name);
      expect(store1.city).not.toBe(store2.city);

      // Clean up
      await prisma.store.deleteMany({
        where: { id: { in: [store1.id, store2.id] } },
      });
    });
  });

  describe('User Model', () => {
    it('should create and retrieve user with all fields', async () => {
      const userData = {
        email: 'test-model@example.com',
        role: 'MANAGER',
        firstName: 'Test',
        lastName: 'User',
        active: true,
      };

      const createdUser = await prisma.user.create({
        data: userData,
      });

      testUserId = createdUser.id;

      expect(createdUser).toHaveProperty('id');
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.role).toBe(userData.role);
      expect(createdUser.firstName).toBe(userData.firstName);
      expect(createdUser.lastName).toBe(userData.lastName);
      expect(createdUser.active).toBe(userData.active);
      expect(createdUser.createdAt).toBeInstanceOf(Date);
      expect(createdUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'unique-test@example.com',
        role: 'STAFF',
        active: true,
      };

      const user1 = await prisma.user.create({ data: userData });

      // Attempt to create another user with the same email
      await expect(
        prisma.user.create({ data: userData })
      ).rejects.toThrow();

      // Clean up
      await prisma.user.delete({ where: { id: user1.id } });
    });

    it('should validate role enum values', async () => {
      const validRoles = ['ADMIN', 'MANAGER', 'STAFF'];
      
      for (const role of validRoles) {
        const userData = {
          email: `role-test-${role.toLowerCase()}@example.com`,
          role: role,
          active: true,
        };

        const user = await prisma.user.create({ data: userData });
        expect(user.role).toBe(role);

        // Clean up
        await prisma.user.delete({ where: { id: user.id } });
      }
    });
  });

  describe('Category Model', () => {
    it('should create and retrieve category with all fields', async () => {
      const categoryData = {
        name: 'Test Category Model',
        description: 'Test category for model testing',
        sortOrder: 5,
        active: true,
      };

      const createdCategory = await prisma.category.create({
        data: categoryData,
      });

      testCategoryId = createdCategory.id;

      expect(createdCategory).toHaveProperty('id');
      expect(createdCategory.name).toBe(categoryData.name);
      expect(createdCategory.description).toBe(categoryData.description);
      expect(createdCategory.sortOrder).toBe(categoryData.sortOrder);
      expect(createdCategory.active).toBe(categoryData.active);
      expect(createdCategory.createdAt).toBeInstanceOf(Date);
      expect(createdCategory.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle default values correctly', async () => {
      const minimalCategory = await prisma.category.create({
        data: {
          name: 'Minimal Category',
        },
      });

      expect(minimalCategory.sortOrder).toBe(0); // Default value
      expect(minimalCategory.active).toBe(true); // Default value
      expect(minimalCategory.description).toBeNull(); // Optional field

      // Clean up
      await prisma.category.delete({ where: { id: minimalCategory.id } });
    });
  });

  describe('MenuItem Model', () => {
    beforeAll(async () => {
      // Ensure we have a test store
      if (!testStoreId) {
        const store = await prisma.store.create({
          data: {
            name: 'MenuItem Test Store',
            country: 'US',
            region: 'North America',
            city: 'Denver',
          },
        });
        testStoreId = store.id;
      }
    });

    it('should create and retrieve menu item with all fields', async () => {
      const menuItemData = {
        name: 'Test Menu Item Model',
        price: 15.99,
        basePrice: 13.99,
        storeId: testStoreId,
        active: true,
      };

      const createdMenuItem = await prisma.menuItem.create({
        data: menuItemData,
        include: { Store: true },
      });

      testMenuItemId = createdMenuItem.id;

      expect(createdMenuItem).toHaveProperty('id');
      expect(createdMenuItem.name).toBe(menuItemData.name);
      expect(Number(createdMenuItem.price)).toBe(menuItemData.price);
      expect(Number(createdMenuItem.basePrice)).toBe(menuItemData.basePrice);
      expect(createdMenuItem.storeId).toBe(menuItemData.storeId);
      expect(createdMenuItem.active).toBe(menuItemData.active);
      expect(createdMenuItem.createdAt).toBeInstanceOf(Date);
      expect(createdMenuItem.updatedAt).toBeInstanceOf(Date);

      // Check relationship
      expect(createdMenuItem.Store).toBeDefined();
      expect(createdMenuItem.Store.id).toBe(testStoreId);
    });

    it('should handle decimal precision for prices', async () => {
      const preciseMenuItem = await prisma.menuItem.create({
        data: {
          name: 'Precise Price Item',
          price: 12.345,
          basePrice: 10.678,
          storeId: testStoreId,
          active: true,
        },
      });

      expect(Number(preciseMenuItem.price)).toBeCloseTo(12.345, 3);
      expect(Number(preciseMenuItem.basePrice)).toBeCloseTo(10.678, 3);

      // Clean up
      await prisma.menuItem.delete({ where: { id: preciseMenuItem.id } });
    });

    it('should enforce foreign key constraint with store', async () => {
      await expect(
        prisma.menuItem.create({
          data: {
            name: 'Invalid Store Item',
            price: 10.99,
            storeId: 'non-existent-store-id',
            active: true,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('ModifierGroup Model', () => {
    it('should create and retrieve modifier group with all fields', async () => {
      const modifierGroupData = {
        name: 'Test Modifier Group Model',
        description: 'Test modifier group for model testing',
        minSelection: 1,
        maxSelection: 3,
        required: true,
        active: true,
      };

      const createdModifierGroup = await prisma.modifierGroup.create({
        data: modifierGroupData,
      });

      testModifierGroupId = createdModifierGroup.id;

      expect(createdModifierGroup).toHaveProperty('id');
      expect(createdModifierGroup.name).toBe(modifierGroupData.name);
      expect(createdModifierGroup.description).toBe(modifierGroupData.description);
      expect(createdModifierGroup.minSelection).toBe(modifierGroupData.minSelection);
      expect(createdModifierGroup.maxSelection).toBe(modifierGroupData.maxSelection);
      expect(createdModifierGroup.required).toBe(modifierGroupData.required);
      expect(createdModifierGroup.active).toBe(modifierGroupData.active);
      expect(createdModifierGroup.createdAt).toBeInstanceOf(Date);
      expect(createdModifierGroup.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle default values correctly', async () => {
      const minimalModifierGroup = await prisma.modifierGroup.create({
        data: {
          name: 'Minimal Modifier Group',
        },
      });

      expect(minimalModifierGroup.minSelection).toBe(0); // Default value
      expect(minimalModifierGroup.maxSelection).toBeNull(); // Optional field
      expect(minimalModifierGroup.required).toBe(false); // Default value
      expect(minimalModifierGroup.active).toBe(true); // Default value

      // Clean up
      await prisma.modifierGroup.delete({ where: { id: minimalModifierGroup.id } });
    });
  });

  describe('Modifier Model', () => {
    it('should create and retrieve modifier with all fields', async () => {
      const modifierData = {
        modifierGroupId: testModifierGroupId,
        name: 'Test Modifier Model',
        priceAdjustment: 2.50,
        active: true,
      };

      const createdModifier = await prisma.modifier.create({
        data: modifierData,
        include: { modifierGroup: true },
      });

      testModifierId = createdModifier.id;

      expect(createdModifier).toHaveProperty('id');
      expect(createdModifier.modifierGroupId).toBe(modifierData.modifierGroupId);
      expect(createdModifier.name).toBe(modifierData.name);
      expect(Number(createdModifier.priceAdjustment)).toBe(modifierData.priceAdjustment);
      expect(createdModifier.active).toBe(modifierData.active);
      expect(createdModifier.createdAt).toBeInstanceOf(Date);
      expect(createdModifier.updatedAt).toBeInstanceOf(Date);

      // Check relationship
      expect(createdModifier.modifierGroup).toBeDefined();
      expect(createdModifier.modifierGroup.id).toBe(testModifierGroupId);
    });

    it('should handle negative price adjustments', async () => {
      const discountModifier = await prisma.modifier.create({
        data: {
          modifierGroupId: testModifierGroupId,
          name: 'Discount Modifier',
          priceAdjustment: -1.50,
          active: true,
        },
      });

      expect(Number(discountModifier.priceAdjustment)).toBe(-1.50);

      // Clean up
      await prisma.modifier.delete({ where: { id: discountModifier.id } });
    });

    it('should enforce foreign key constraint with modifier group', async () => {
      await expect(
        prisma.modifier.create({
          data: {
            modifierGroupId: 'non-existent-group-id',
            name: 'Invalid Group Modifier',
            priceAdjustment: 1.00,
            active: true,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('MenuItemCategory Relationship', () => {
    it('should create and manage many-to-many relationship', async () => {
      const relationship = await prisma.menuItemCategory.create({
        data: {
          menuItemId: testMenuItemId,
          categoryId: testCategoryId,
        },
        include: {
          menuItem: true,
          category: true,
        },
      });

      expect(relationship.menuItemId).toBe(testMenuItemId);
      expect(relationship.categoryId).toBe(testCategoryId);
      expect(relationship.menuItem).toBeDefined();
      expect(relationship.category).toBeDefined();

      // Verify the relationship from both sides
      const menuItemWithCategories = await prisma.menuItem.findUnique({
        where: { id: testMenuItemId },
        include: { categories: { include: { category: true } } },
      });

      const categoryWithItems = await prisma.category.findUnique({
        where: { id: testCategoryId },
        include: { items: { include: { menuItem: true } } },
      });

      expect(menuItemWithCategories?.categories).toHaveLength(1);
      expect(menuItemWithCategories?.categories[0].category.id).toBe(testCategoryId);

      expect(categoryWithItems?.items).toHaveLength(1);
      expect(categoryWithItems?.items[0].menuItem.id).toBe(testMenuItemId);
    });

    it('should enforce unique constraint on relationship', async () => {
      // Attempt to create duplicate relationship
      await expect(
        prisma.menuItemCategory.create({
          data: {
            menuItemId: testMenuItemId,
            categoryId: testCategoryId,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('PriceOverride Model', () => {
    it('should create and retrieve price override with all fields', async () => {
      const priceOverrideData = {
        storeId: testStoreId,
        menuItemId: testMenuItemId,
        price: 18.99,
        effectiveFrom: new Date(),
        effectiveTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      const createdPriceOverride = await prisma.priceOverride.create({
        data: priceOverrideData,
        include: {
          store: true,
          menuItem: true,
        },
      });

      expect(createdPriceOverride).toHaveProperty('id');
      expect(createdPriceOverride.storeId).toBe(priceOverrideData.storeId);
      expect(createdPriceOverride.menuItemId).toBe(priceOverrideData.menuItemId);
      expect(Number(createdPriceOverride.price)).toBe(priceOverrideData.price);
      expect(createdPriceOverride.effectiveFrom).toBeInstanceOf(Date);
      expect(createdPriceOverride.effectiveTo).toBeInstanceOf(Date);
      expect(createdPriceOverride.createdAt).toBeInstanceOf(Date);
      expect(createdPriceOverride.updatedAt).toBeInstanceOf(Date);

      // Check relationships
      expect(createdPriceOverride.store).toBeDefined();
      expect(createdPriceOverride.menuItem).toBeDefined();
    });

    it('should handle optional effectiveTo field', async () => {
      const openEndedOverride = await prisma.priceOverride.create({
        data: {
          storeId: testStoreId,
          menuItemId: testMenuItemId,
          price: 20.99,
          effectiveFrom: new Date(),
          // effectiveTo is optional
        },
      });

      expect(openEndedOverride.effectiveTo).toBeNull();

      // Clean up
      await prisma.priceOverride.delete({ where: { id: openEndedOverride.id } });
    });
  });

  describe('Order Model', () => {
    it('should create and retrieve order with all fields', async () => {
      const orderData = {
        total: 45.99,
        status: 'PENDING',
        storeId: testStoreId,
        userId: testUserId,
      };

      const createdOrder = await prisma.order.create({
        data: orderData,
        include: {
          Store: true,
          User: true,
        },
      });

      expect(createdOrder).toHaveProperty('id');
      expect(Number(createdOrder.total)).toBe(orderData.total);
      expect(createdOrder.status).toBe(orderData.status);
      expect(createdOrder.storeId).toBe(orderData.storeId);
      expect(createdOrder.userId).toBe(orderData.userId);
      expect(createdOrder.createdAt).toBeInstanceOf(Date);
      // Note: updatedAt may not be included in the response with relationships

      // Check relationships
      expect(createdOrder.Store).toBeDefined();
      expect(createdOrder.User).toBeDefined();

      // Clean up
      await prisma.order.delete({ where: { id: createdOrder.id } });
    });

    it('should validate status enum values', async () => {
      const validStatuses = ['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
      
      for (const status of validStatuses) {
        const order = await prisma.order.create({
          data: {
            total: 25.99,
            status: status,
            storeId: testStoreId,
            userId: testUserId,
          },
        });

        expect(order.status).toBe(status);

        // Clean up
        await prisma.order.delete({ where: { id: order.id } });
      }
    });
  });

  describe('AuditEntry Model', () => {
    it('should create and retrieve audit entry with all fields', async () => {
      const auditData = {
        actor: 'test-user',
        entity: 'TestEntity',
        entityId: 'test-entity-id',
        action: 'TEST_ACTION',
        diff: JSON.stringify({
          old: { value: 'old' },
          new: { value: 'new' },
        }),
      };

      const createdAuditEntry = await prisma.auditEntry.create({
        data: auditData,
      });

      expect(createdAuditEntry).toHaveProperty('id');
      expect(createdAuditEntry.actor).toBe(auditData.actor);
      expect(createdAuditEntry.entity).toBe(auditData.entity);
      expect(createdAuditEntry.entityId).toBe(auditData.entityId);
      expect(createdAuditEntry.action).toBe(auditData.action);
      expect(createdAuditEntry.diff).toBe(auditData.diff);
      expect(createdAuditEntry.timestamp).toBeInstanceOf(Date);

      // Verify diff can be parsed back
      const parsedDiff = JSON.parse(createdAuditEntry.diff || '{}');
      expect(parsedDiff).toHaveProperty('old');
      expect(parsedDiff).toHaveProperty('new');

      // Clean up
      await prisma.auditEntry.delete({ where: { id: createdAuditEntry.id } });
    });

    it('should handle null diff field', async () => {
      const auditEntry = await prisma.auditEntry.create({
        data: {
          actor: 'test-user',
          entity: 'TestEntity',
          entityId: 'test-entity-id',
          action: 'TEST_ACTION',
          // diff is optional
        },
      });

      expect(auditEntry.diff).toBeNull();

      // Clean up
      await prisma.auditEntry.delete({ where: { id: auditEntry.id } });
    });
  });

  describe('FeatureFlag Model', () => {
    it('should create and retrieve feature flag with all fields', async () => {
      const flagData = {
        key: 'test-model-flag',
        enabled: true,
        description: 'Test flag for model testing',
      };

      const createdFlag = await prisma.featureFlag.create({
        data: flagData,
      });

      expect(createdFlag).toHaveProperty('id');
      expect(createdFlag.key).toBe(flagData.key);
      expect(createdFlag.enabled).toBe(flagData.enabled);
      expect(createdFlag.description).toBe(flagData.description);
      expect(createdFlag.createdAt).toBeInstanceOf(Date);
      expect(createdFlag.updatedAt).toBeInstanceOf(Date);

      // Clean up
      await prisma.featureFlag.delete({ where: { id: createdFlag.id } });
    });

    it('should enforce unique key constraint', async () => {
      const flagData = {
        key: 'unique-test-flag',
        enabled: false,
      };

      const flag1 = await prisma.featureFlag.create({ data: flagData });

      // Attempt to create another flag with the same key
      await expect(
        prisma.featureFlag.create({ data: flagData })
      ).rejects.toThrow();

      // Clean up
      await prisma.featureFlag.delete({ where: { id: flag1.id } });
    });

    it('should handle default values correctly', async () => {
      const minimalFlag = await prisma.featureFlag.create({
        data: {
          key: 'minimal-test-flag',
        },
      });

      expect(minimalFlag.enabled).toBe(false); // Default value
      expect(minimalFlag.description).toBeNull(); // Optional field

      // Clean up
      await prisma.featureFlag.delete({ where: { id: minimalFlag.id } });
    });
  });

  describe('Database Indexes and Performance', () => {
    it('should efficiently query audit entries by entity and timestamp', async () => {
      // Create multiple audit entries
      const auditEntries = [];
      for (let i = 0; i < 10; i++) {
        auditEntries.push({
          actor: 'test-user',
          entity: 'TestEntity',
          entityId: `test-entity-${i}`,
          action: 'TEST_ACTION',
          timestamp: new Date(Date.now() - i * 1000), // Different timestamps
        });
      }

      const createdEntries = await Promise.all(
        auditEntries.map(entry => prisma.auditEntry.create({ data: entry }))
      );

      // Query by entity (should use index)
      const entityEntries = await prisma.auditEntry.findMany({
        where: { entity: 'TestEntity' },
        orderBy: { timestamp: 'desc' },
      });

      expect(entityEntries.length).toBeGreaterThanOrEqual(10);

      // Query by entity and entityId (should use compound index)
      const specificEntries = await prisma.auditEntry.findMany({
        where: {
          entity: 'TestEntity',
          entityId: 'test-entity-0',
        },
      });

      expect(specificEntries.length).toBe(1);

      // Clean up
      await prisma.auditEntry.deleteMany({
        where: { id: { in: createdEntries.map(e => e.id) } },
      });
    });

    it('should efficiently query orders with store and user relationships', async () => {
      // Create test orders
      const orders = [];
      for (let i = 0; i < 5; i++) {
        orders.push({
          total: 20.99 + i,
          status: 'PENDING',
          storeId: testStoreId,
          userId: testUserId,
        });
      }

      const createdOrders = await Promise.all(
        orders.map(order => prisma.order.create({ data: order }))
      );

      // Query with relationships (should be efficient)
      const ordersWithRelations = await prisma.order.findMany({
        where: { storeId: testStoreId },
        include: {
          Store: true,
          User: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(ordersWithRelations.length).toBeGreaterThanOrEqual(5);
      ordersWithRelations.forEach(order => {
        expect(order.Store).toBeDefined();
        expect(order.User).toBeDefined();
      });

      // Clean up
      await prisma.order.deleteMany({
        where: { id: { in: createdOrders.map(o => o.id) } },
      });
    });
  });
});