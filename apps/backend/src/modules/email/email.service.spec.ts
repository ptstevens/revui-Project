import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { LinkPurpose } from '@prisma/client';

describe('EmailService', () => {
  let service: EmailService;
  let magicLinkService: MagicLinkService;
  let configService: ConfigService;

  const mockMagicLinkService = {
    generate: jest.fn(),
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
        { provide: MagicLinkService, useValue: mockMagicLinkService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    magicLinkService = module.get<MagicLinkService>(MagicLinkService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createVerificationToken', () => {
    it('should create a verification token using MagicLinkService', async () => {
      const mockToken = 'test-magic-link-token';
      mockMagicLinkService.generate.mockResolvedValue(mockToken);

      const token = await service.createVerificationToken('tenant-id', 'test@example.com');

      expect(token).toBe(mockToken);
      expect(mockMagicLinkService.generate).toHaveBeenCalledWith({
        tenantId: 'tenant-id',
        email: 'test@example.com',
        purpose: LinkPurpose.EMAIL_VERIFICATION,
      });
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
