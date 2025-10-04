import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { PrismaClient } from '@prisma/client'
import { MenuController } from '../../src/routes/menu'

describe('Menu Modifiers Integration', () => {
  let app: INestApplication
  let prisma: PrismaClient

  // Mock data
  const mockStore = {
    id: 'store-1',
    name: 'Test Store',
    country: 'US',
    region: 'AMER',
  }

  const mockMenuItem = {
    id: 'item-1',
    name: 'Test Item',
    price: 9.99,
    active: true,
    storeId: 'store-1',
    Store: mockStore,
  }

  const mockModifierGroups = [
    {
      id: 'group-1',
      name: 'Bread Types',
      description: 'Choose your bread',
      active: true,
    },
    {
      id: 'group-2',
      name: 'Extras',
      description: 'Add extra toppings',
      active: true,
    },
  ]

  const mockMenuItemModifier = {
    id: 'modifier-1',
    menuItemId: 'item-1',
    modifierGroupId: 'group-1',
    menuItem: mockMenuItem,
    modifierGroup: mockModifierGroups[0],
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        {
          provide: PrismaClient,
          useValue: {
            menuItem: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            modifierGroup: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            menuItemModifier: {
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
            store: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = moduleFixture.get<PrismaClient>(PrismaClient)
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /menu/modifier-groups', () => {
    it('should return all active modifier groups', async () => {
      ;(prisma.modifierGroup.findMany as jest.Mock).mockResolvedValue(mockModifierGroups)

      const response = await request(app.getHttpServer())
        .get('/menu/modifier-groups')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: mockModifierGroups,
      })

      expect(prisma.modifierGroup.findMany).toHaveBeenCalledWith({
        where: { active: true },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      })
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.modifierGroup.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app.getHttpServer())
        .get('/menu/modifier-groups')
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch modifier groups',
        data: [],
      })
    })
  })

  describe('GET /menu/items/:id/modifiers', () => {
    it('should return attached modifiers for a menu item', async () => {
      const menuItemWithModifiers = {
        ...mockMenuItem,
        modifiers: [mockMenuItemModifier],
      }

      ;(prisma.menuItem.findUnique as jest.Mock).mockResolvedValue(menuItemWithModifiers)

      const response = await request(app.getHttpServer())
        .get('/menu/items/item-1/modifiers')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: [mockModifierGroups[0]],
      })

      expect(prisma.menuItem.findUnique).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        select: expect.any(Object),
      })
    })

    it('should return error for non-existent menu item', async () => {
      ;(prisma.menuItem.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app.getHttpServer())
        .get('/menu/items/non-existent/modifiers')
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Menu item not found',
        data: [],
      })
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.menuItem.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app.getHttpServer())
        .get('/menu/items/item-1/modifiers')
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch item modifiers',
        data: [],
      })
    })
  })

  describe('POST /menu/items/:id/modifiers', () => {
    it('should attach modifier to menu item successfully', async () => {
      ;(prisma.menuItem.findUnique as jest.Mock).mockResolvedValue(mockMenuItem)
      ;(prisma.modifierGroup.findUnique as jest.Mock).mockResolvedValue(mockModifierGroups[0])
      ;(prisma.menuItemModifier.findUnique as jest.Mock).mockResolvedValue(null) // No existing relationship
      ;(prisma.menuItemModifier.create as jest.Mock).mockResolvedValue(mockMenuItemModifier)

      const response = await request(app.getHttpServer())
        .post('/menu/items/item-1/modifiers')
        .send({ modifierGroupId: 'group-1' })
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: null,
      })

      expect(prisma.menuItemModifier.create).toHaveBeenCalledWith({
        data: {
          menuItemId: 'item-1',
          modifierGroupId: 'group-1',
        },
      })
    })

    it('should return error for non-existent menu item', async () => {
      ;(prisma.menuItem.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app.getHttpServer())
        .post('/menu/items/non-existent/modifiers')
        .send({ modifierGroupId: 'group-1' })
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Menu item not found',
      })
    })

    it('should return error for non-existent modifier group', async () => {
      ;(prisma.menuItem.findUnique as jest.Mock).mockResolvedValue(mockMenuItem)
      ;(prisma.modifierGroup.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app.getHttpServer())
        .post('/menu/items/item-1/modifiers')
        .send({ modifierGroupId: 'non-existent' })
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Modifier group not found',
      })
    })

    it('should return error for already attached modifier', async () => {
      ;(prisma.menuItem.findUnique as jest.Mock).mockResolvedValue(mockMenuItem)
      ;(prisma.modifierGroup.findUnique as jest.Mock).mockResolvedValue(mockModifierGroups[0])
      ;(prisma.menuItemModifier.findUnique as jest.Mock).mockResolvedValue(mockMenuItemModifier) // Existing relationship

      const response = await request(app.getHttpServer())
        .post('/menu/items/item-1/modifiers')
        .send({ modifierGroupId: 'group-1' })
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Modifier group already attached to this item',
      })
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.menuItem.findUnique as jest.Mock).mockResolvedValue(mockMenuItem)
      ;(prisma.modifierGroup.findUnique as jest.Mock).mockResolvedValue(mockModifierGroups[0])
      ;(prisma.menuItemModifier.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.menuItemModifier.create as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app.getHttpServer())
        .post('/menu/items/item-1/modifiers')
        .send({ modifierGroupId: 'group-1' })
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to attach modifier group',
      })
    })
  })

  describe('DELETE /menu/items/:id/modifiers/:groupId', () => {
    it('should detach modifier from menu item successfully', async () => {
      ;(prisma.menuItemModifier.findUnique as jest.Mock).mockResolvedValue(mockMenuItemModifier)
      ;(prisma.menuItemModifier.delete as jest.Mock).mockResolvedValue(mockMenuItemModifier)

      const response = await request(app.getHttpServer())
        .delete('/menu/items/item-1/modifiers/group-1')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: null,
      })

      expect(prisma.menuItemModifier.delete).toHaveBeenCalledWith({
        where: {
          menuItemId_modifierGroupId: {
            menuItemId: 'item-1',
            modifierGroupId: 'group-1',
          },
        },
      })
    })

    it('should return error for non-existent relationship', async () => {
      ;(prisma.menuItemModifier.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await request(app.getHttpServer())
        .delete('/menu/items/item-1/modifiers/group-1')
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Modifier group not attached to this item',
      })
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.menuItemModifier.findUnique as jest.Mock).mockResolvedValue(mockMenuItemModifier)
      ;(prisma.menuItemModifier.delete as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await request(app.getHttpServer())
        .delete('/menu/items/item-1/modifiers/group-1')
        .expect(200)

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to detach modifier group',
      })
    })
  })
})