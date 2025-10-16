import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@/common/services/prisma.service';
import { EmailService } from '../email/email.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let magicLinkService: MagicLinkService;

  const mockPrismaService: any = {
    organization: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  const mockEmailService = {
    createVerificationToken: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  const mockMagicLinkService = {
    generate: jest.fn(),
    validate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: MagicLinkService, useValue: mockMagicLinkService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    magicLinkService = module.get<MagicLinkService>(MagicLinkService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validDto: CreateOrganizationDto = {
      organizationName: 'Test Corp',
      adminEmail: 'admin@test.com',
      adminName: 'Admin User',
      industry: 'Technology',
      companySize: '11-50',
    };

    it('should successfully register a new organization', async () => {
      const mockOrg = {
        id: 'org-id',
        tenantId: 'tenant-id',
        name: 'Test Corp',
        industry: 'Technology',
        companySize: '11-50',
      };

      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'ADMIN',
      };

      mockPrismaService.organization.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockOrg);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockEmailService.createVerificationToken.mockResolvedValue('verification-token');
      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

      const result = await service.register(validDto);

      expect(result.organizationId).toBe('org-id');
      expect(result.tenantId).toBe('tenant-id');
      expect(result.organizationName).toBe('Test Corp');
      expect(result.adminEmail).toBe('admin@test.com');
      expect(result.message).toContain('Organization created successfully');

      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Corp',
          industry: 'Technology',
          companySize: '11-50',
        },
      });

      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'admin@test.com',
        'Admin User',
        'Test Corp',
        'verification-token'
      );
    });

    it('should throw ConflictException if organization name already exists', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue({
        id: 'existing-org',
        name: 'Test Corp',
      });

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
      await expect(service.register(validDto)).rejects.toThrow('Organization name already exists');
    });

    it('should throw ConflictException if admin email already exists', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: 'admin@test.com',
      });

      await expect(service.register(validDto)).rejects.toThrow(ConflictException);
      await expect(service.register(validDto)).rejects.toThrow('Admin email already registered');
    });
  });

  describe('verifyEmail', () => {
    const mockToken = 'verification-token';

    it('should successfully verify email', async () => {
      const validationResult = {
        success: true,
        tenantId: 'tenant-id',
        email: 'admin@test.com',
      };

      mockMagicLinkService.validate.mockResolvedValue(validationResult);
      mockPrismaService.organization.findUnique.mockResolvedValue({
        name: 'Test Corp',
      });
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyEmail(mockToken);

      expect(result.message).toBe('Email verified successfully');
      expect(result.organizationName).toBe('Test Corp');
      expect(result.email).toBe('admin@test.com');

      expect(mockMagicLinkService.validate).toHaveBeenCalledWith(mockToken, {
        ipAddress: undefined,
        userAgent: undefined,
      });

      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-id',
          email: 'admin@test.com',
        },
        data: {
          emailVerifiedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if magic link does not exist', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        success: false,
        errorCode: 'INVALID_TOKEN',
        error: 'Token not found',
      });

      await expect(service.verifyEmail(mockToken)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if magic link already used', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        success: false,
        errorCode: 'ALREADY_USED',
        error: 'Verification link already used',
      });

      await expect(service.verifyEmail(mockToken)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if magic link expired', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        success: false,
        errorCode: 'EXPIRED',
        error: 'Verification link expired',
      });

      await expect(service.verifyEmail(mockToken)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByTenantId', () => {
    it('should return organization with users', async () => {
      const mockOrganization = {
        id: 'org-id',
        tenantId: 'tenant-id',
        name: 'Test Corp',
        users: [
          {
            id: 'user-id',
            email: 'admin@test.com',
            name: 'Admin User',
            role: 'ADMIN',
          },
        ],
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      const result = await service.findByTenantId('tenant-id');

      expect(result).toEqual(mockOrganization);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-id' },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              emailVerifiedAt: true,
              createdAt: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if organization does not exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(service.findByTenantId('invalid-tenant-id')).rejects.toThrow(NotFoundException);
      await expect(service.findByTenantId('invalid-tenant-id')).rejects.toThrow('Organization not found');
    });
  });
});
