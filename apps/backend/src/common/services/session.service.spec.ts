import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const tenantId = 'tenant-123';
    const ipAddress = '127.0.0.1';
    const userAgent = 'Mozilla/5.0';
    const deviceName = 'Chrome Browser';

    it('should create a new session and return token', async () => {
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        tenantId,
        userId,
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
      });

      const token = await service.create(userId, tenantId, ipAddress, userAgent, deviceName);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);

      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          userId,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          ipAddress,
          userAgent,
          deviceName,
        },
      });
    });

    it('should create session without optional parameters', async () => {
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        tenantId,
        userId,
      });

      const token = await service.create(userId, tenantId);

      expect(token).toBeDefined();
      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          userId,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          ipAddress: undefined,
          userAgent: undefined,
          deviceName: undefined,
        },
      });
    });

    it('should set expiration to 24 hours from now', async () => {
      mockPrismaService.session.create.mockResolvedValue({
        id: 'session-123',
        tenantId,
        userId,
      });

      const beforeCreate = Date.now();
      await service.create(userId, tenantId);
      const afterCreate = Date.now();

      const createCall = mockPrismaService.session.create.mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt;

      // Should be approximately 24 hours from now
      const expectedMin = beforeCreate + 24 * 60 * 60 * 1000;
      const expectedMax = afterCreate + 24 * 60 * 60 * 1000;

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('validate', () => {
    const mockToken = 'test-token-12345';
    const tokenHash = crypto.createHash('sha256').update(mockToken).digest('hex');
    const userId = 'user-123';
    const tenantId = 'tenant-123';

    it('should successfully validate active session', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockSession = {
        id: 'session-123',
        userId,
        tenantId,
        tokenHash,
        expiresAt: futureDate,
        loggedOutAt: null,
        organization: { name: 'Test Corp' },
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.session.update.mockResolvedValue(mockSession);

      const result = await service.validate(mockToken);

      expect(result.success).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.tenantId).toBe(tenantId);
      expect(result.sessionId).toBe('session-123');

      // Should update lastActivityAt
      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { lastActivityAt: expect.any(Date) },
      });
    });

    it('should return error for invalid token', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      const result = await service.validate(mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session token');
      expect(result.userId).toBeUndefined();
    });

    it('should return error for expired session', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const mockSession = {
        id: 'session-123',
        userId,
        tenantId,
        tokenHash,
        expiresAt: pastDate,
        loggedOutAt: null,
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      const result = await service.validate(mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
    });

    it('should return error for logged out session', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockSession = {
        id: 'session-123',
        userId,
        tenantId,
        tokenHash,
        expiresAt: futureDate,
        loggedOutAt: new Date(),
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      const result = await service.validate(mockToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session already logged out');
    });
  });

  describe('invalidate', () => {
    const mockToken = 'test-token-12345';

    it('should invalidate session by token', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 1 });

      await service.invalidate(mockToken);

      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          tokenHash: expect.any(String),
          loggedOutAt: null,
        },
        data: {
          loggedOutAt: expect.any(Date),
        },
      });
    });
  });

  describe('invalidateById', () => {
    const sessionId = 'session-123';

    it('should invalidate session by ID', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 1 });

      await service.invalidateById(sessionId);

      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          id: sessionId,
          loggedOutAt: null,
        },
        data: {
          loggedOutAt: expect.any(Date),
        },
      });
    });
  });

  describe('invalidateAllForUser', () => {
    const userId = 'user-123';
    const tenantId = 'tenant-123';

    it('should invalidate all sessions for user', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.invalidateAllForUser(userId, tenantId);

      expect(count).toBe(3);
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId,
          tenantId,
          loggedOutAt: null,
        },
        data: {
          loggedOutAt: expect.any(Date),
        },
      });
    });

    it('should return 0 if no active sessions found', async () => {
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 0 });

      const count = await service.invalidateAllForUser(userId, tenantId);

      expect(count).toBe(0);
    });
  });

  describe('getActiveSessions', () => {
    const userId = 'user-123';
    const tenantId = 'tenant-123';

    it('should return active sessions for user', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Chrome',
          deviceName: 'Desktop',
          lastActivityAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'session-2',
          ipAddress: '192.168.1.1',
          userAgent: 'Firefox',
          deviceName: 'Laptop',
          lastActivityAt: new Date(),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await service.getActiveSessions(userId, tenantId);

      expect(result).toEqual(mockSessions);
      expect(mockPrismaService.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          tenantId,
          loggedOutAt: null,
          expiresAt: {
            gte: expect.any(Date),
          },
        },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          deviceName: true,
          lastActivityAt: true,
          createdAt: true,
        },
        orderBy: {
          lastActivityAt: 'desc',
        },
      });
    });

    it('should return empty array if no active sessions', async () => {
      mockPrismaService.session.findMany.mockResolvedValue([]);

      const result = await service.getActiveSessions(userId, tenantId);

      expect(result).toEqual([]);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 10 });

      const count = await service.cleanupExpiredSessions();

      expect(count).toBe(10);
      expect(mockPrismaService.session.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              expiresAt: {
                lt: expect.any(Date),
              },
            },
            {
              loggedOutAt: {
                not: null,
              },
              createdAt: {
                lt: expect.any(Date),
              },
            },
          ],
        },
      });
    });

    it('should return 0 if no sessions to cleanup', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 0 });

      const count = await service.cleanupExpiredSessions();

      expect(count).toBe(0);
    });

    it('should cleanup logged out sessions older than 30 days', async () => {
      mockPrismaService.session.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanupExpiredSessions();

      const deleteCall = mockPrismaService.session.deleteMany.mock.calls[0][0];
      const loggedOutCondition = deleteCall.where.OR[1];

      expect(loggedOutCondition.loggedOutAt).toEqual({ not: null });

      // Check that createdAt is approximately 30 days ago
      const expectedDate = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const actualDate = loggedOutCondition.createdAt.lt.getTime();

      // Allow 1 second variance
      expect(actualDate).toBeGreaterThan(expectedDate - 1000);
      expect(actualDate).toBeLessThan(expectedDate + 1000);
    });
  });
});
