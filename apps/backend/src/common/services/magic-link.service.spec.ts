import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MagicLinkService } from './magic-link.service';
import { PrismaService } from './prisma.service';
import { LinkPurpose } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Story 1.2: Comprehensive tests for MagicLinkService
 *
 * Tests cover all acceptance criteria:
 * - AC1: Cryptographically secure token generation (256-bit, unique)
 * - AC2: One-time use enforcement
 * - AC3: Time-based expiration
 * - AC4: Comprehensive audit trail
 * - AC5: Secure token storage (hashed)
 */
describe('MagicLinkService', () => {
  let service: MagicLinkService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    organization: {
      findUnique: jest.fn(),
    },
    magicLink: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MagicLinkService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MagicLinkService>(MagicLinkService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AC1: Cryptographically Secure Token Generation', () => {
    it('should generate 256-bit (32 byte) tokens', async () => {
      const mockOrg = {
        tenantId: 'tenant-123',
        magicLinkExpirationHours: 48,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.magicLink.create.mockResolvedValue({
        id: 'link-id',
        tenantId: 'tenant-123',
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const token = await service.generate({
        tenantId: 'tenant-123',
        email: 'test@example.com',
        purpose: LinkPurpose.EMAIL_VERIFICATION,
      });

      // Base64url encoded 32 bytes should be 43 characters (32 * 4/3, rounded up)
      expect(token).toHaveLength(43);
      // Should be URL-safe (no +, /, or = padding)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should generate unique tokens (no collisions in 10,000 tokens)', async () => {
      const result = await service.testTokenGeneration(10000);

      expect(result.success).toBe(true);
      expect(result.uniqueTokens).toBe(10000);
      expect(result.collisions).toBe(0);
    });

    it('should store SHA-256 hash in database, not plain token', async () => {
      const mockOrg = {
        tenantId: 'tenant-123',
        magicLinkExpirationHours: 48,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.magicLink.create.mockImplementation((data: any) => {
        // Verify the stored hash is 64 characters (SHA-256 hex)
        expect(data.data.tokenHash).toHaveLength(64);
        expect(data.data.tokenHash).toMatch(/^[a-f0-9]+$/);
        return Promise.resolve({ id: 'link-id' });
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const token = await service.generate({
        tenantId: 'tenant-123',
        email: 'test@example.com',
        purpose: LinkPurpose.EMAIL_VERIFICATION,
      });

      expect(token).not.toHaveLength(64); // Plain token should not be the hash
    });
  });

  describe('generate()', () => {
    const validOptions = {
      tenantId: 'tenant-123',
      email: 'test@example.com',
      purpose: LinkPurpose.EMAIL_VERIFICATION,
    };

    it('should use organization default expiration when not overridden', async () => {
      const mockOrg = {
        tenantId: 'tenant-123',
        magicLinkExpirationHours: 72,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.magicLink.create.mockImplementation((data: any) => {
        const expiresAt = new Date(data.data.expiresAt);
        const now = new Date();
        const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Should be approximately 72 hours (within 1 minute tolerance)
        expect(hoursDiff).toBeGreaterThan(71.98);
        expect(hoursDiff).toBeLessThan(72.02);

        return Promise.resolve({ id: 'link-id' });
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.generate(validOptions);
    });

    it('should use custom expiration when provided', async () => {
      const customExpiration = 24;

      mockPrismaService.organization.findUnique.mockResolvedValue({
        tenantId: 'tenant-123',
        magicLinkExpirationHours: 48,
      });
      mockPrismaService.magicLink.create.mockImplementation((data: any) => {
        const expiresAt = new Date(data.data.expiresAt);
        const now = new Date();
        const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Should be approximately 24 hours (within 1 minute tolerance)
        expect(hoursDiff).toBeGreaterThan(23.98);
        expect(hoursDiff).toBeLessThan(24.02);

        return Promise.resolve({ id: 'link-id' });
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.generate({
        ...validOptions,
        expirationHours: customExpiration,
      });
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.generate(validOptions)).rejects.toThrow(NotFoundException);
      await expect(service.generate(validOptions)).rejects.toThrow('Organization not found');
    });

    it('should create audit log entry on successful generation', async () => {
      const mockOrg = {
        tenantId: 'tenant-123',
        magicLinkExpirationHours: 48,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.magicLink.create.mockResolvedValue({
        id: 'link-123',
        tenantId: 'tenant-123',
      });
      mockPrismaService.auditLog.create.mockImplementation((data: any) => {
        expect(data.data.tenantId).toBe('tenant-123');
        expect(data.data.action).toBe('MAGIC_LINK_GENERATED');
        expect(data.data.resource).toBe('magic_link');
        expect(data.data.metadata.magicLinkId).toBe('link-123');
        expect(data.data.metadata.email).toBe('test@example.com');
        expect(data.data.metadata.purpose).toBe(LinkPurpose.EMAIL_VERIFICATION);
        return Promise.resolve({});
      });

      await service.generate(validOptions);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
    });

    it('should support optional userId and taskId associations', async () => {
      const mockOrg = {
        tenantId: 'tenant-123',
        magicLinkExpirationHours: 48,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.magicLink.create.mockImplementation((data: any) => {
        expect(data.data.userId).toBe('user-123');
        expect(data.data.taskId).toBe('task-456');
        return Promise.resolve({ id: 'link-id' });
      });
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.generate({
        ...validOptions,
        userId: 'user-123',
        taskId: 'task-456',
      });
    });
  });

  describe('AC2 & AC3: validate() - One-Time Use & Expiration', () => {
    const validToken = 'valid-token-string';
    const tokenHash = crypto.createHash('sha256').update(validToken).digest('hex');

    it('should successfully validate a valid unused token', async () => {
      const mockMagicLink = {
        id: 'link-123',
        tenantId: 'tenant-123',
        tokenHash,
        email: 'test@example.com',
        purpose: LinkPurpose.EMAIL_VERIFICATION,
        userId: null,
        taskId: null,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        usedAt: null,
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);
      mockPrismaService.magicLink.update.mockResolvedValue(mockMagicLink);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.validate(validToken, {
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
      });

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe('tenant-123');
      expect(result.email).toBe('test@example.com');
      expect(result.magicLinkId).toBe('link-123');

      // Verify token marked as used
      expect(mockPrismaService.magicLink.update).toHaveBeenCalledWith({
        where: { id: 'link-123' },
        data: {
          usedAt: expect.any(Date),
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
        },
      });
    });

    it('should reject invalid token with INVALID_TOKEN error', async () => {
      mockPrismaService.magicLink.findUnique.mockResolvedValue(null);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.validate('invalid-token');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_TOKEN');
      expect(result.error).toContain('Invalid link');
    });

    it('should reject already used token with ALREADY_USED error (AC2: One-Time Use)', async () => {
      const mockMagicLink = {
        id: 'link-123',
        tenantId: 'tenant-123',
        tokenHash,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(Date.now() - 1800000), // Used 30 minutes ago
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.validate(validToken);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ALREADY_USED');
      expect(result.error).toContain('already been used');

      // Should NOT mark as used again
      expect(mockPrismaService.magicLink.update).not.toHaveBeenCalled();
    });

    it('should reject expired token with EXPIRED error (AC3: Time-Based Expiration)', async () => {
      const mockMagicLink = {
        id: 'link-123',
        tenantId: 'tenant-123',
        tokenHash,
        email: 'test@example.com',
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
        usedAt: null,
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);
      mockPrismaService.auditLog.create.mockResolvedValue({});

      const result = await service.validate(validToken);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('EXPIRED');
      expect(result.error).toContain('expired');

      // Should NOT mark as used
      expect(mockPrismaService.magicLink.update).not.toHaveBeenCalled();
    });
  });

  describe('AC4: Audit Trail', () => {
    const validToken = 'valid-token-string';
    const tokenHash = crypto.createHash('sha256').update(validToken).digest('hex');

    it('should log successful access with all metadata', async () => {
      const mockMagicLink = {
        id: 'link-123',
        tenantId: 'tenant-123',
        tokenHash,
        email: 'test@example.com',
        purpose: LinkPurpose.EMAIL_VERIFICATION,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);
      mockPrismaService.magicLink.update.mockResolvedValue(mockMagicLink);

      let auditLogData: any;
      mockPrismaService.auditLog.create.mockImplementation((data: any) => {
        auditLogData = data.data;
        return Promise.resolve({});
      });

      await service.validate(validToken, {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      // Verify audit log contains all required data
      expect(auditLogData.tenantId).toBe('tenant-123');
      expect(auditLogData.action).toBe('MAGIC_LINK_ACCESS_SUCCESS');
      expect(auditLogData.resource).toBe('magic_link');
      expect(auditLogData.ipAddress).toBe('192.168.1.1');
      expect(auditLogData.userAgent).toBe('Mozilla/5.0');
      expect(auditLogData.metadata.magicLinkId).toBe('link-123');
      expect(auditLogData.metadata.email).toBe('test@example.com');
    });

    it('should log failed access attempts with failure reason', async () => {
      mockPrismaService.magicLink.findUnique.mockResolvedValue(null);

      let auditLogData: any;
      mockPrismaService.auditLog.create.mockImplementation((data: any) => {
        auditLogData = data.data;
        return Promise.resolve({});
      });

      await service.validate('invalid-token', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(auditLogData.action).toBe('MAGIC_LINK_ACCESS_FAILED');
      expect(auditLogData.metadata.reason).toBe('INVALID_TOKEN');
      expect(auditLogData.ipAddress).toBe('192.168.1.1');
      expect(auditLogData.userAgent).toBe('Mozilla/5.0');
    });

    it('should log expired token access with expiration time', async () => {
      const expiredDate = new Date(Date.now() - 3600000);
      const mockMagicLink = {
        id: 'link-123',
        tenantId: 'tenant-123',
        tokenHash: crypto.createHash('sha256').update(validToken).digest('hex'),
        email: 'test@example.com',
        expiresAt: expiredDate,
        usedAt: null,
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);

      let auditLogData: any;
      mockPrismaService.auditLog.create.mockImplementation((data: any) => {
        auditLogData = data.data;
        return Promise.resolve({});
      });

      await service.validate(validToken);

      expect(auditLogData.metadata.reason).toBe('EXPIRED');
      expect(auditLogData.metadata.expiresAt).toBe(expiredDate.toISOString());
    });
  });

  describe('getAccessLogs()', () => {
    it('should return access logs for a tenant', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenantId: 'tenant-123',
          action: 'MAGIC_LINK_ACCESS_SUCCESS',
          metadata: { email: 'test@example.com' },
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          tenantId: 'tenant-123',
          action: 'MAGIC_LINK_ACCESS_FAILED',
          metadata: { reason: 'EXPIRED' },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getAccessLogs('tenant-123');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          action: {
            in: ['MAGIC_LINK_ACCESS_SUCCESS', 'MAGIC_LINK_ACCESS_FAILED', 'MAGIC_LINK_GENERATED'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        skip: 0,
      });
    });

    it('should filter logs by email', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          tenantId: 'tenant-123',
          action: 'MAGIC_LINK_ACCESS_SUCCESS',
          metadata: { email: 'test@example.com' },
        },
      ]);

      const result = await service.getAccessLogs('tenant-123', {
        email: 'test@example.com',
      });

      expect(result).toHaveLength(1);
      expect((result[0].metadata as any).email).toBe('test@example.com');
    });

    it('should filter logs by success/failure', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'MAGIC_LINK_ACCESS_FAILED',
        },
      ]);

      await service.getAccessLogs('tenant-123', { success: false });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'MAGIC_LINK_ACCESS_FAILED',
          }),
        })
      );
    });

    it('should support pagination with limit and offset', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getAccessLogs('tenant-123', {
        limit: 50,
        offset: 100,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        })
      );
    });

    it('should support date range filtering', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      await service.getAccessLogs('tenant-123', {
        startDate,
        endDate,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });

  describe('Security: Token Hashing', () => {
    it('should never log or return full token hash in error scenarios', async () => {
      mockPrismaService.magicLink.findUnique.mockResolvedValue(null);

      let auditLogData: any;
      mockPrismaService.auditLog.create.mockImplementation((data: any) => {
        auditLogData = data.data;
        return Promise.resolve({});
      });

      await service.validate('some-token');

      // Verify only partial hash is logged
      expect(auditLogData.metadata.tokenHash).toMatch(/^[a-f0-9]{8}\.\.\./);
      expect(auditLogData.metadata.tokenHash).toHaveLength(11); // 8 chars + '...'
    });
  });
});
