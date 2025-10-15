import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@/common/services/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;
  let emailService: EmailService;

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
    magicLink: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrismaService)),
  };

  const mockEmailService = {
    createVerificationToken: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
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
    const mockTokenHash = 'token-hash';

    it('should successfully verify email', async () => {
      const mockMagicLink = {
        id: 'link-id',
        tenantId: 'tenant-id',
        tokenHash: mockTokenHash,
        email: 'admin@test.com',
        purpose: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        usedAt: null,
        organization: {
          name: 'Test Corp',
        },
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);
      mockPrismaService.magicLink.update.mockResolvedValue(mockMagicLink);
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.verifyEmail(mockTokenHash);

      expect(result.message).toBe('Email verified successfully');
      expect(result.organizationName).toBe('Test Corp');
      expect(result.email).toBe('admin@test.com');

      expect(mockPrismaService.magicLink.update).toHaveBeenCalledWith({
        where: { id: 'link-id' },
        data: { usedAt: expect.any(Date) },
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
      mockPrismaService.magicLink.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail(mockTokenHash)).rejects.toThrow(NotFoundException);
      await expect(service.verifyEmail(mockTokenHash)).rejects.toThrow('Invalid verification link');
    });

    it('should throw ConflictException if magic link already used', async () => {
      const mockMagicLink = {
        id: 'link-id',
        tokenHash: mockTokenHash,
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        organization: { name: 'Test Corp' },
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);

      await expect(service.verifyEmail(mockTokenHash)).rejects.toThrow(ConflictException);
      await expect(service.verifyEmail(mockTokenHash)).rejects.toThrow('Verification link already used');
    });

    it('should throw ConflictException if magic link expired', async () => {
      const mockMagicLink = {
        id: 'link-id',
        tokenHash: mockTokenHash,
        usedAt: null,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        organization: { name: 'Test Corp' },
      };

      mockPrismaService.magicLink.findUnique.mockResolvedValue(mockMagicLink);

      await expect(service.verifyEmail(mockTokenHash)).rejects.toThrow(ConflictException);
      await expect(service.verifyEmail(mockTokenHash)).rejects.toThrow('Verification link expired');
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
