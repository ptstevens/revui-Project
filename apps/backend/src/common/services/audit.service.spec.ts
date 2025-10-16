import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditLogEntry, AuditLogQuery } from './audit.service';
import { PrismaService } from './prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      const entry: AuditLogEntry = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        action: 'CREATE',
        resourceType: 'USER',
        resourceId: 'user-456',
        oldValue: undefined,
        newValue: { name: 'John Doe' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: { source: 'admin-panel' },
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        ...entry,
      });

      await service.log(entry);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: entry.tenantId,
          userId: entry.userId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          oldValue: entry.oldValue,
          newValue: entry.newValue,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata,
        },
      });
    });

    it('should handle partial audit log entry', async () => {
      const entry: AuditLogEntry = {
        action: 'VIEW',
        resourceType: 'RECORDING',
      };

      mockPrismaService.auditLog.create.mockResolvedValue({
        id: 'audit-123',
        ...entry,
      });

      await service.log(entry);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: undefined,
          userId: undefined,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: undefined,
          oldValue: undefined,
          newValue: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          metadata: undefined,
        },
      });
    });
  });

  describe('logAuth', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const ipAddress = '127.0.0.1';
    const userAgent = 'Chrome/90.0';

    it('should log LOGIN event', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logAuth('LOGIN', tenantId, userId, ipAddress, userAgent);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          userId,
          action: 'LOGIN',
          resourceType: 'SESSION',
          ipAddress,
          userAgent,
        }),
      });
    });

    it('should log LOGOUT event', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logAuth('LOGOUT', tenantId, userId, ipAddress, userAgent);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGOUT',
          resourceType: 'SESSION',
        }),
      });
    });

    it('should log LOGIN_FAILED event with metadata', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});
      const metadata = { reason: 'Invalid credentials' };

      await service.logAuth('LOGIN_FAILED', tenantId, userId, ipAddress, userAgent, metadata);

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'LOGIN_FAILED',
          metadata,
        }),
      });
    });
  });

  describe('logMagicLinkAccess', () => {
    const tenantId = 'tenant-123';
    const email = 'user@test.com';
    const magicLinkId = 'link-123';
    const ipAddress = '127.0.0.1';
    const userAgent = 'Chrome/90.0';

    it('should log MAGIC_LINK_SENT event', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logMagicLinkAccess(
        'MAGIC_LINK_SENT',
        tenantId,
        email,
        magicLinkId,
        ipAddress,
        userAgent,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          action: 'MAGIC_LINK_SENT',
          resourceType: 'MAGIC_LINK',
          resourceId: magicLinkId,
          ipAddress,
          userAgent,
          metadata: { email },
        }),
      });
    });

    it('should log MAGIC_LINK_USED event', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logMagicLinkAccess(
        'MAGIC_LINK_USED',
        tenantId,
        email,
        magicLinkId,
        ipAddress,
        userAgent,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'MAGIC_LINK_USED',
          metadata: { email },
        }),
      });
    });

    it('should log MAGIC_LINK_FAILED event', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logMagicLinkAccess(
        'MAGIC_LINK_FAILED',
        tenantId,
        email,
        magicLinkId,
        ipAddress,
        userAgent,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'MAGIC_LINK_FAILED',
        }),
      });
    });
  });

  describe('logResourceChange', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const resourceType = 'USER';
    const resourceId = 'user-456';
    const ipAddress = '127.0.0.1';
    const userAgent = 'Chrome/90.0';

    it('should log CREATE event', async () => {
      const newValue = { name: 'John Doe', email: 'john@test.com' };
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logResourceChange(
        'CREATE',
        tenantId,
        userId,
        resourceType,
        resourceId,
        undefined,
        newValue,
        ipAddress,
        userAgent,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          resourceType,
          resourceId,
          oldValue: undefined,
          newValue,
        }),
      });
    });

    it('should log UPDATE event with old and new values', async () => {
      const oldValue = { name: 'John Doe' };
      const newValue = { name: 'Jane Doe' };
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logResourceChange(
        'UPDATE',
        tenantId,
        userId,
        resourceType,
        resourceId,
        oldValue,
        newValue,
        ipAddress,
        userAgent,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          oldValue,
          newValue,
        }),
      });
    });

    it('should log DELETE event', async () => {
      const oldValue = { name: 'John Doe' };
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logResourceChange(
        'DELETE',
        tenantId,
        userId,
        resourceType,
        resourceId,
        oldValue,
        undefined,
        ipAddress,
        userAgent,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETE',
          oldValue,
          newValue: undefined,
        }),
      });
    });
  });

  describe('logRecordingAccess', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const recordingId = 'recording-123';
    const duration = 120; // 2 minutes
    const ipAddress = '127.0.0.1';
    const userAgent = 'Chrome/90.0';

    it('should log recording access event', async () => {
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.logRecordingAccess(
        tenantId,
        userId,
        recordingId,
        duration,
        ipAddress,
        userAgent,
      );

      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          userId,
          action: 'VIEW',
          resourceType: 'RECORDING',
          resourceId: recordingId,
          ipAddress,
          userAgent,
          metadata: {
            viewDurationSeconds: duration,
          },
        }),
      });
    });
  });

  describe('query', () => {
    it('should query audit logs with default pagination', async () => {
      const mockLogs = [
        { id: 'audit-1', action: 'CREATE', createdAt: new Date() },
        { id: 'audit-2', action: 'UPDATE', createdAt: new Date() },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(2);

      const query: AuditLogQuery = { tenantId: 'tenant-123' };
      const result = await service.query(query);

      expect(result).toEqual({
        data: mockLogs,
        total: 2,
        page: 1,
        limit: 100,
        totalPages: 1,
      });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 100,
      });
    });

    it('should query with custom pagination', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(250);

      const query: AuditLogQuery = {
        tenantId: 'tenant-123',
        page: 3,
        limit: 50,
      };

      const result = await service.query(query);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(5); // 250 / 50 = 5 pages

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
        orderBy: { createdAt: 'desc' },
        skip: 100, // (page 3 - 1) * 50
        take: 50,
      });
    });

    it('should filter by multiple parameters', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      const query: AuditLogQuery = {
        tenantId: 'tenant-123',
        userId: 'user-123',
        action: 'UPDATE',
        resourceType: 'USER',
        resourceId: 'user-456',
      };

      await service.query(query);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          userId: 'user-123',
          action: 'UPDATE',
          resourceType: 'USER',
          resourceId: 'user-456',
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 100,
      });
    });

    it('should filter by date range', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const query: AuditLogQuery = {
        tenantId: 'tenant-123',
        startDate,
        endDate,
      };

      await service.query(query);

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-123',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 100,
      });
    });
  });

  describe('getRecordingAccessHistory', () => {
    const recordingId = 'recording-123';
    const tenantId = 'tenant-123';

    it('should return recording access history', async () => {
      const mockHistory = [
        {
          id: 'audit-1',
          userId: 'user-123',
          action: 'VIEW',
          createdAt: new Date(),
          metadata: { viewDurationSeconds: 120 },
        },
        {
          id: 'audit-2',
          userId: 'user-456',
          action: 'VIEW',
          createdAt: new Date(),
          metadata: { viewDurationSeconds: 60 },
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockHistory);

      const result = await service.getRecordingAccessHistory(recordingId, tenantId);

      expect(result).toEqual(mockHistory);
      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          resourceType: 'RECORDING',
          resourceId: recordingId,
          action: 'VIEW',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array if no access history', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getRecordingAccessHistory(recordingId, tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('exportToCsv', () => {
    it('should export audit logs to CSV format', async () => {
      const mockLogs = [
        {
          createdAt: new Date('2025-01-15T10:00:00Z'),
          tenantId: 'tenant-123',
          userId: 'user-123',
          action: 'CREATE',
          resourceType: 'USER',
          resourceId: 'user-456',
          ipAddress: '127.0.0.1',
          userAgent: 'Chrome/90.0',
          oldValue: undefined,
          newValue: { name: 'John Doe' },
          metadata: undefined,
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const query: AuditLogQuery = { tenantId: 'tenant-123' };
      const csv = await service.exportToCsv(query);

      // Check CSV header
      expect(csv).toContain('Timestamp,Tenant ID,User ID,Action,Resource Type,Resource ID');

      // Check CSV data row
      expect(csv).toContain('2025-01-15T10:00:00.000Z');
      expect(csv).toContain('tenant-123');
      expect(csv).toContain('user-123');
      expect(csv).toContain('CREATE');
      expect(csv).toContain('USER');
    });

    it('should escape CSV values with special characters', async () => {
      const mockLogs = [
        {
          createdAt: new Date('2025-01-15T10:00:00Z'),
          tenantId: 'tenant-123',
          userId: 'user-123',
          action: 'UPDATE',
          resourceType: 'USER',
          resourceId: 'user-456',
          ipAddress: '127.0.0.1',
          userAgent: 'Chrome, Version 90.0',
          oldValue: undefined,
          newValue: { name: 'John "Johnny" Doe' },
          metadata: undefined,
        },
      ];

      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const csv = await service.exportToCsv({ tenantId: 'tenant-123' });

      // Check that commas and quotes are properly escaped
      expect(csv).toContain('"Chrome, Version 90.0"');
      // CSV escapes quotes by doubling them: " becomes ""
      expect(csv).toContain('"{""name"":""John \\""Johnny\\"" Doe""}"');
    });

    it('should use large limit for export', async () => {
      mockPrismaService.auditLog.findMany.mockResolvedValue([]);
      mockPrismaService.auditLog.count.mockResolvedValue(0);

      await service.exportToCsv({ tenantId: 'tenant-123' });

      expect(mockPrismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10000, // Large limit for export
        }),
      );
    });
  });

  describe('cleanupOldAuditLogs', () => {
    it('should delete logs older than 7 years', async () => {
      mockPrismaService.auditLog.deleteMany.mockResolvedValue({ count: 150 });

      const count = await service.cleanupOldAuditLogs();

      expect(count).toBe(150);
      expect(mockPrismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });

      // Verify the date is approximately 7 years ago
      const deleteCall = mockPrismaService.auditLog.deleteMany.mock.calls[0][0];
      const cutoffDate = deleteCall.where.createdAt.lt;
      const now = new Date();
      const sevenYearsAgo = new Date(now.getFullYear() - 7, now.getMonth(), now.getDate());

      // Allow 1 day variance
      const diff = Math.abs(cutoffDate.getTime() - sevenYearsAgo.getTime());
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000); // Less than 1 day
    });

    it('should return 0 if no old logs to cleanup', async () => {
      mockPrismaService.auditLog.deleteMany.mockResolvedValue({ count: 0 });

      const count = await service.cleanupOldAuditLogs();

      expect(count).toBe(0);
    });
  });
});
