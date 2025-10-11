import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { SettingsController } from '../../src/routes/settings';
import { CreateUserDto, UpdateUserDto, AuditLogQueryDto, UpdateFeatureFlagDto } from '../../src/dto/settings.dto';

describe('SettingsController Integration Tests', () => {
  let controller: SettingsController;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: PrismaClient,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.auditEntry.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test-settings'
        }
      }
    });
    await prisma.featureFlag.deleteMany({
      where: {
        key: {
          contains: 'test-'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('Users & Roles CRUD', () => {
    let testUserId: string;

    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test-settings-user@example.com',
        role: 'MANAGER',
        firstName: 'Test',
        lastName: 'User',
        active: true,
      };

      const result = await controller.createUser(createUserDto);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.email).toBe(createUserDto.email);
        expect(result.data.role).toBe(createUserDto.role);
        expect(result.data.firstName).toBe(createUserDto.firstName);
        expect(result.data.lastName).toBe(createUserDto.lastName);
        expect(result.data.active).toBe(true);

        testUserId = result.data.id;
      }
    });

    it('should get all users', async () => {
      const result = await controller.getUsers();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      if (result.data) {
        expect(result.data.length).toBeGreaterThan(0);
        
        const testUser = result.data.find(user => user.id === testUserId);
        expect(testUser).toBeDefined();
      }
    });

    it('should get a specific user by id', async () => {
      const result = await controller.getUser(testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.id).toBe(testUserId);
        expect(result.data.email).toBe('test-settings-user@example.com');
      }
    });

    it('should update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
        role: 'ADMIN',
      };

      const result = await controller.updateUser(testUserId, updateUserDto);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.firstName).toBe('Updated');
        expect(result.data.lastName).toBe('Name');
        expect(result.data.role).toBe('ADMIN');
      }
    });

    it('should prevent creating user with duplicate email', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test-settings-user@example.com', // Same email as existing user
        role: 'STAFF',
      };

      const result = await controller.createUser(createUserDto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should delete a user', async () => {
      const result = await controller.deleteUser(testUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();

      // Verify user is deleted
      const getResult = await controller.getUser(testUserId);
      expect(getResult.success).toBe(false);
    });
  });

  describe('Audit Log', () => {
    it('should retrieve audit log entries', async () => {
      const query: AuditLogQueryDto = {
        page: 1,
        limit: 10,
      };

      const result = await controller.getAuditLog(query);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.entries).toBeDefined();
        expect(Array.isArray(result.data.entries)).toBe(true);
        expect(result.data.pagination).toBeDefined();
        expect(result.data.pagination.page).toBe(1);
        expect(result.data.pagination.limit).toBe(10);
      }
    });

    it('should filter audit log by entity', async () => {
      const query: AuditLogQueryDto = {
        entity: 'User',
        page: 1,
        limit: 10,
      };

      const result = await controller.getAuditLog(query);

      expect(result.success).toBe(true);
      if (result.data) {
        expect(result.data.entries.every(entry => entry.entity === 'User')).toBe(true);
      }
    });

    it('should search audit log entries', async () => {
      const query: AuditLogQueryDto = {
        search: 'test-settings',
        page: 1,
        limit: 10,
      };

      const result = await controller.getAuditLog(query);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Feature Flags', () => {
    let testFlagKey: string;

    it('should create a new feature flag', async () => {
      testFlagKey = 'test-settings-flag';
      const createData = {
        key: testFlagKey,
        enabled: false,
        description: 'Test feature flag for settings integration test',
      };

      const result = await controller.createFeatureFlag(createData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.key).toBe(testFlagKey);
        expect(result.data.enabled).toBe(false);
        expect(result.data.description).toBe(createData.description);
      }
    });

    it('should get all feature flags', async () => {
      const result = await controller.getFeatureFlags();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      if (result.data) {
        const testFlag = result.data.find(flag => flag.key === testFlagKey);
        expect(testFlag).toBeDefined();
      }
    });

    it('should get a specific feature flag by key', async () => {
      const result = await controller.getFeatureFlag(testFlagKey);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.key).toBe(testFlagKey);
      }
    });

    it('should update a feature flag', async () => {
      const updateDto: UpdateFeatureFlagDto = {
        enabled: true,
        description: 'Updated test feature flag',
      };

      const result = await controller.updateFeatureFlag(testFlagKey, updateDto);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.enabled).toBe(true);
        expect(result.data.description).toBe('Updated test feature flag');
      }
    });

    it('should prevent creating feature flag with duplicate key', async () => {
      const createData = {
        key: testFlagKey, // Same key as existing flag
        enabled: false,
      };

      const result = await controller.createFeatureFlag(createData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should delete a feature flag', async () => {
      const result = await controller.deleteFeatureFlag(testFlagKey);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();

      // Verify flag is deleted
      const getResult = await controller.getFeatureFlag(testFlagKey);
      expect(getResult.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent user', async () => {
      const result = await controller.getUser('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle non-existent feature flag', async () => {
      const result = await controller.getFeatureFlag('non-existent-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate user role', async () => {
      const createUserDto: CreateUserDto = {
        email: 'invalid-role-test@example.com',
        role: 'INVALID_ROLE' as any,
      };

      const result = await controller.createUser(createUserDto);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });
  });
});