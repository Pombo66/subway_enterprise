import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/module';

describe('Menu Categories API Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testStoreId: string;
  let testCategoryId: string;
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

    // Create test store and menu item
    const testStore = await prisma.store.create({
      data: {
        name: 'Test Store for Categories',
        country: 'US',
        region: 'North America',
        city: 'Boston',
      },
    });
    testStoreId = testStore.id;

    const testMenuItem = await prisma.menuItem.create({
      data: {
        name: 'Test Item for Categories',
        price: 9.99,
        storeId: testStoreId,
        active: true,
      },
    });
    testMenuItemId = testMenuItem.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.menuItemCategory.deleteMany({
      where: { menuItemId: testMenuItemId },
    });
    await prisma.category.deleteMany({
      where: { name: { contains: 'Test Category' } },
    });
    await prisma.menuItem.deleteMany({
      where: { storeId: testStoreId },
    });
    await prisma.store.delete({
      where: { id: testStoreId },
    });
    await app.close();
  });

  describe('GET /menu/categories', () => {
    beforeAll(async () => {
      // Create test category
      const testCategory = await prisma.category.create({
        data: {
          name: 'Test Category Main',
          description: 'Main test category',
          sortOrder: 1,
          active: true,
        },
      });
      testCategoryId = testCategory.id;
    });

    it('should return categories with item counts', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/categories')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Find our test category
      const testCategory = response.body.data.find((cat: any) => cat.id === testCategoryId);
      expect(testCategory).toBeDefined();
      expect(testCategory).toHaveProperty('name', 'Test Category Main');
      expect(testCategory).toHaveProperty('description', 'Main test category');
      expect(testCategory).toHaveProperty('sortOrder', 1);
      expect(testCategory).toHaveProperty('active', true);
      expect(testCategory).toHaveProperty('itemCount');
      expect(typeof testCategory.itemCount).toBe('number');
    });

    it('should return categories ordered by sortOrder then name', async () => {
      // Create additional categories with different sort orders
      await prisma.category.createMany({
        data: [
          { name: 'Z Category', sortOrder: 0, active: true },
          { name: 'A Category', sortOrder: 2, active: true },
          { name: 'B Category', sortOrder: 0, active: true },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/menu/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      const categories = response.body.data;

      // Should be ordered by sortOrder first, then by name
      let prevSortOrder = -1;
      let prevName = '';
      
      categories.forEach((category: any) => {
        if (category.sortOrder > prevSortOrder) {
          prevSortOrder = category.sortOrder;
          prevName = '';
        } else if (category.sortOrder === prevSortOrder) {
          expect(category.name >= prevName).toBe(true);
          prevName = category.name;
        }
      });
    });
  });

  describe('GET /menu/categories/:id', () => {
    it('should return category with associated menu items', async () => {
      // First assign the menu item to the category
      await prisma.menuItemCategory.create({
        data: {
          menuItemId: testMenuItemId,
          categoryId: testCategoryId,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/menu/categories/${testCategoryId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const category = response.body.data;
      expect(category).toHaveProperty('id', testCategoryId);
      expect(category).toHaveProperty('name', 'Test Category Main');
      expect(category).toHaveProperty('items');
      expect(Array.isArray(category.items)).toBe(true);
      expect(category.items.length).toBeGreaterThan(0);

      // Check the menu item structure
      const item = category.items[0];
      expect(item).toHaveProperty('menuItem');
      expect(item.menuItem).toHaveProperty('id', testMenuItemId);
      expect(item.menuItem).toHaveProperty('name', 'Test Item for Categories');
      expect(item.menuItem).toHaveProperty('price', 9.99);
    });

    it('should return error for non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .get('/menu/categories/non-existent-id')
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Category not found');
    });
  });

  describe('POST /menu/categories', () => {
    it('should create a new category successfully', async () => {
      const newCategory = {
        name: 'New Test Category',
        description: 'A new category for testing',
        sortOrder: 5,
        active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/menu/categories')
        .send(newCategory)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', newCategory.name);
      expect(response.body.data).toHaveProperty('description', newCategory.description);
      expect(response.body.data).toHaveProperty('sortOrder', newCategory.sortOrder);
      expect(response.body.data).toHaveProperty('active', newCategory.active);

      // Verify the category was created in the database
      const createdCategory = await prisma.category.findUnique({
        where: { id: response.body.data.id },
      });
      expect(createdCategory).toBeDefined();
      expect(createdCategory?.name).toBe(newCategory.name);
    });

    it('should use default values for optional fields', async () => {
      const minimalCategory = {
        name: 'Minimal Test Category',
      };

      const response = await request(app.getHttpServer())
        .post('/menu/categories')
        .send(minimalCategory)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sortOrder', 0);
      expect(response.body.data).toHaveProperty('active', true);
      expect(response.body.data).toHaveProperty('description', null);
    });

    it('should prevent duplicate category names', async () => {
      const duplicateCategory = {
        name: 'Test Category Main', // Same name as existing category
        description: 'Duplicate category',
      };

      const response = await request(app.getHttpServer())
        .post('/menu/categories')
        .send(duplicateCategory)
        .expect(201);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidCategory = {
        description: 'Missing name field',
      };

      const response = await request(app.getHttpServer())
        .post('/menu/categories')
        .send(invalidCategory)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /menu/categories/:id', () => {
    let updateCategoryId: string;

    beforeAll(async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Update Test Category',
          description: 'Original description',
          sortOrder: 10,
          active: true,
        },
      });
      updateCategoryId = category.id;
    });

    it('should update category successfully', async () => {
      const updates = {
        name: 'Updated Test Category',
        description: 'Updated description',
        sortOrder: 15,
        active: false,
      };

      const response = await request(app.getHttpServer())
        .patch(`/menu/categories/${updateCategoryId}`)
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', updates.name);
      expect(response.body.data).toHaveProperty('description', updates.description);
      expect(response.body.data).toHaveProperty('sortOrder', updates.sortOrder);
      expect(response.body.data).toHaveProperty('active', updates.active);

      // Verify changes in database
      const updatedCategory = await prisma.category.findUnique({
        where: { id: updateCategoryId },
      });
      expect(updatedCategory?.name).toBe(updates.name);
      expect(updatedCategory?.description).toBe(updates.description);
    });

    it('should allow partial updates', async () => {
      const partialUpdate = {
        description: 'Partially updated description',
      };

      const response = await request(app.getHttpServer())
        .patch(`/menu/categories/${updateCategoryId}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('description', partialUpdate.description);
      // Other fields should remain unchanged
      expect(response.body.data).toHaveProperty('name', 'Updated Test Category');
    });

    it('should prevent duplicate names when updating', async () => {
      const duplicateUpdate = {
        name: 'Test Category Main', // Name of existing category
      };

      const response = await request(app.getHttpServer())
        .patch(`/menu/categories/${updateCategoryId}`)
        .send(duplicateUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return error for non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .patch('/menu/categories/non-existent-id')
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /menu/categories/:id', () => {
    let deleteCategoryId: string;

    beforeEach(async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Delete Test Category',
          active: true,
        },
      });
      deleteCategoryId = category.id;
    });

    it('should delete empty category successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/menu/categories/${deleteCategoryId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data', null);

      // Verify category is deleted
      const deletedCategory = await prisma.category.findUnique({
        where: { id: deleteCategoryId },
      });
      expect(deletedCategory).toBeNull();
    });

    it('should prevent deletion of category with items', async () => {
      // Assign an item to the category
      await prisma.menuItemCategory.create({
        data: {
          menuItemId: testMenuItemId,
          categoryId: deleteCategoryId,
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/menu/categories/${deleteCategoryId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('contains menu items');

      // Category should still exist
      const category = await prisma.category.findUnique({
        where: { id: deleteCategoryId },
      });
      expect(category).toBeDefined();
    });

    it('should return error for non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .delete('/menu/categories/non-existent-id')
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /menu/categories/reorder', () => {
    let reorderCategoryIds: string[];

    beforeAll(async () => {
      // Create categories for reordering
      const categories = await Promise.all([
        prisma.category.create({
          data: { name: 'Reorder Category 1', sortOrder: 0, active: true },
        }),
        prisma.category.create({
          data: { name: 'Reorder Category 2', sortOrder: 1, active: true },
        }),
        prisma.category.create({
          data: { name: 'Reorder Category 3', sortOrder: 2, active: true },
        }),
      ]);
      reorderCategoryIds = categories.map(cat => cat.id);
    });

    it('should reorder categories successfully', async () => {
      // Reverse the order
      const newOrder = [...reorderCategoryIds].reverse();

      const response = await request(app.getHttpServer())
        .put('/menu/categories/reorder')
        .send({ categoryIds: newOrder })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data', null);

      // Verify the new sort orders
      const updatedCategories = await prisma.category.findMany({
        where: { id: { in: reorderCategoryIds } },
        orderBy: { sortOrder: 'asc' },
      });

      expect(updatedCategories[0].id).toBe(newOrder[0]);
      expect(updatedCategories[0].sortOrder).toBe(0);
      expect(updatedCategories[1].id).toBe(newOrder[1]);
      expect(updatedCategories[1].sortOrder).toBe(1);
      expect(updatedCategories[2].id).toBe(newOrder[2]);
      expect(updatedCategories[2].sortOrder).toBe(2);
    });

    it('should return error for non-existent categories', async () => {
      const invalidOrder = [...reorderCategoryIds, 'non-existent-id'];

      const response = await request(app.getHttpServer())
        .put('/menu/categories/reorder')
        .send({ categoryIds: invalidOrder })
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('Category-Item Relationships', () => {
    describe('POST /menu/categories/:id/items', () => {
      it('should assign item to category successfully', async () => {
        const response = await request(app.getHttpServer())
          .post(`/menu/categories/${testCategoryId}/items`)
          .send({ menuItemId: testMenuItemId })
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data', null);

        // Verify relationship exists
        const relationship = await prisma.menuItemCategory.findUnique({
          where: {
            menuItemId_categoryId: {
              menuItemId: testMenuItemId,
              categoryId: testCategoryId,
            },
          },
        });
        expect(relationship).toBeDefined();
      });

      it('should prevent duplicate assignments', async () => {
        // Try to assign the same item again
        const response = await request(app.getHttpServer())
          .post(`/menu/categories/${testCategoryId}/items`)
          .send({ menuItemId: testMenuItemId })
          .expect(201);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('already assigned');
      });

      it('should return error for non-existent category', async () => {
        const response = await request(app.getHttpServer())
          .post('/menu/categories/non-existent-id/items')
          .send({ menuItemId: testMenuItemId })
          .expect(201);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('Category not found');
      });

      it('should return error for non-existent menu item', async () => {
        const response = await request(app.getHttpServer())
          .post(`/menu/categories/${testCategoryId}/items`)
          .send({ menuItemId: 'non-existent-item-id' })
          .expect(201);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('Menu item not found');
      });
    });

    describe('DELETE /menu/categories/:id/items/:itemId', () => {
      it('should remove item from category successfully', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/menu/categories/${testCategoryId}/items/${testMenuItemId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data', null);

        // Verify relationship is removed
        const relationship = await prisma.menuItemCategory.findUnique({
          where: {
            menuItemId_categoryId: {
              menuItemId: testMenuItemId,
              categoryId: testCategoryId,
            },
          },
        });
        expect(relationship).toBeNull();
      });

      it('should return error for non-existent relationship', async () => {
        const response = await request(app.getHttpServer())
          .delete(`/menu/categories/${testCategoryId}/items/${testMenuItemId}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body.error).toContain('not assigned');
      });
    });
  });
});