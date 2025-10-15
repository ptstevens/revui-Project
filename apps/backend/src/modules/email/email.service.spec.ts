import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { PrismaService } from '@/common/services/prisma.service';

describe('EmailService', () => {
  let service: EmailService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    magicLink: {
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        CORS_ORIGIN: 'http://localhost:5173',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMagicLinkToken', () => {
    it('should generate a token and tokenHash', () => {
      const result = service.generateMagicLinkToken();

      expect(result.token).toBeDefined();
      expect(result.tokenHash).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(typeof result.tokenHash).toBe('string');
      expect(result.token.length).toBeGreaterThan(0);
      expect(result.tokenHash.length).toBe(64); // SHA-256 hex digest length
    });

    it('should generate unique tokens', () => {
      const result1 = service.generateMagicLinkToken();
      const result2 = service.generateMagicLinkToken();

      expect(result1.token).not.toBe(result2.token);
      expect(result1.tokenHash).not.toBe(result2.tokenHash);
    });

    it('should generate tokens with URL-safe characters', () => {
      const result = service.generateMagicLinkToken();

      // base64url encoding should not contain +, /, or =
      expect(result.token).not.toMatch(/[+/=]/);
    });
  });

  describe('createVerificationToken', () => {
    it('should create a verification token in database', async () => {
      const mockMagicLink = {
        id: 'link-id',
        tenantId: 'tenant-id',
        tokenHash: 'token-hash',
        email: 'test@example.com',
        purpose: 'EMAIL_VERIFICATION',
        expiresAt: expect.any(Date),
      };

      mockPrismaService.magicLink.create.mockResolvedValue(mockMagicLink);

      const token = await service.createVerificationToken('tenant-id', 'test@example.com');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      expect(mockPrismaService.magicLink.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-id',
          tokenHash: expect.any(String),
          email: 'test@example.com',
          purpose: 'EMAIL_VERIFICATION',
          expiresAt: expect.any(Date),
        },
      });

      // Verify expiration is set to 24 hours from now
      const callArgs = mockPrismaService.magicLink.create.mock.calls[0][0];
      const expiresAt = callArgs.data.expiresAt;
      const now = new Date();
      const timeDiff = expiresAt.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThan(23);
      expect(hoursDiff).toBeLessThan(25);
    });
  });

  describe('sendWelcomeEmail', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    afterAll(() => {
      consoleSpy.mockRestore();
    });

    it('should log email in test environment', async () => {
      await service.sendWelcomeEmail(
        'test@example.com',
        'Test User',
        'Test Corp',
        'verification-token'
      );

      expect(consoleSpy).toHaveBeenCalled();
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV');
    });

    it('should include verification link with token', async () => {
      await service.sendWelcomeEmail(
        'test@example.com',
        'Test User',
        'Test Corp',
        'test-token-123'
      );

      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).toContain('test-token-123');
      expect(logCalls).toContain('verify-email');
    });
  });
});
