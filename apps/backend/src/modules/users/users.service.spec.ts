import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@/common/services/prisma.service';
import { EmailService } from '../email/email.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { AuditService } from '@/common/services/audit.service';
import { UserRole, InvitationStatus, LinkPurpose } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let magicLinkService: MagicLinkService;
  let auditService: AuditService;

  const mockPrismaService: any = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  };

  const mockEmailService = {
    sendInvitationEmail: jest.fn(),
  };

  const mockMagicLinkService = {
    generate: jest.fn(),
    validate: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: MagicLinkService, useValue: mockMagicLinkService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    magicLinkService = module.get<MagicLinkService>(MagicLinkService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('bulkInvite', () => {
    const tenantId = 'tenant-123';
    const invitedById = 'admin-user-123';

    const mockAdmin = {
      id: invitedById,
      tenantId,
      email: 'admin@test.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
      deactivatedAt: null,
    };

    const mockOrganization = {
      tenantId,
      name: 'Test Corp',
    };

    const bulkInviteDto = {
      users: [
        { email: 'user1@test.com', name: 'User One', role: UserRole.USER },
        { email: 'user2@test.com', name: 'User Two', role: UserRole.REVIEWER },
      ],
    };

    it('should successfully invite multiple users', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin) // Inviter lookup
        .mockResolvedValueOnce(null) // User 1 doesn't exist
        .mockResolvedValueOnce(null); // User 2 doesn't exist

      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      mockPrismaService.user.create
        .mockResolvedValueOnce({ id: 'user-1', ...bulkInviteDto.users[0] })
        .mockResolvedValueOnce({ id: 'user-2', ...bulkInviteDto.users[1] });

      mockMagicLinkService.generate
        .mockResolvedValueOnce('token-1')
        .mockResolvedValueOnce('token-2');

      mockEmailService.sendInvitationEmail.mockResolvedValue(undefined);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.bulkInvite(tenantId, invitedById, bulkInviteDto);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results.success).toHaveLength(2);

      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledTimes(2);
      expect(mockAuditService.log).toHaveBeenCalledTimes(2);
    });

    it('should throw ForbiddenException if inviter is not admin', async () => {
      const nonAdminUser = { ...mockAdmin, role: UserRole.USER };
      mockPrismaService.user.findFirst.mockResolvedValue(nonAdminUser);

      await expect(
        service.bulkInvite(tenantId, invitedById, bulkInviteDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle existing users gracefully', async () => {
      // Mock inviter lookup
      mockPrismaService.user.findFirst.mockResolvedValueOnce(mockAdmin);

      // Mock organization lookup
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrganization);

      // Mock existing user checks (using findUnique, not findFirst!)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'existing-user', email: 'user1@test.com' }) // User 1 exists
        .mockResolvedValueOnce(null); // User 2 doesn't exist

      // Mock user creation for user 2
      mockPrismaService.user.create.mockResolvedValueOnce({
        id: 'user-2',
        ...bulkInviteDto.users[1]
      });

      mockMagicLinkService.generate.mockResolvedValue('token-2');
      mockEmailService.sendInvitationEmail.mockResolvedValue(undefined);
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.bulkInvite(tenantId, invitedById, bulkInviteDto);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results.failed[0].reason).toBe('User already exists in this organization');
    });

    it('should throw NotFoundException if organization not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockAdmin);
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.bulkInvite(tenantId, invitedById, bulkInviteDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    const token = 'invitation-token';
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const email = 'user@test.com';

    it('should successfully accept invitation', async () => {
      const validationResult = {
        success: true,
        tenantId,
        userId,
        email,
        purpose: LinkPurpose.INVITATION,
      };

      mockMagicLinkService.validate.mockResolvedValue(validationResult);
      mockPrismaService.user.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.organization.findUnique.mockResolvedValue({
        tenantId,
        name: 'Test Corp',
      });
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.acceptInvitation(token, '127.0.0.1', 'test-agent');

      expect(result.message).toBe('Invitation accepted successfully');
      expect(result.email).toBe(email);
      expect(mockPrismaService.user.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          email,
          invitationStatus: InvitationStatus.PENDING,
        },
        data: {
          invitationStatus: InvitationStatus.ACCEPTED,
          emailVerifiedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        success: false,
        errorCode: 'INVALID_TOKEN',
        error: 'Token not found',
      });

      await expect(service.acceptInvitation(token)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired token', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        success: false,
        errorCode: 'EXPIRED',
        error: 'Token expired',
      });

      await expect(service.acceptInvitation(token)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for wrong link purpose', async () => {
      mockMagicLinkService.validate.mockResolvedValue({
        success: true,
        tenantId,
        userId,
        email,
        purpose: LinkPurpose.EMAIL_VERIFICATION,
      });

      await expect(service.acceptInvitation(token)).rejects.toThrow(new BadRequestException('Invalid invitation link'));
    });
  });

  describe('update', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const adminId = 'admin-123';

    const mockAdmin = {
      id: adminId,
      tenantId,
      role: UserRole.ADMIN,
      deactivatedAt: null,
    };

    const mockUser = {
      id: userId,
      tenantId,
      email: 'user@test.com',
      name: 'Original Name',
      role: UserRole.USER,
    };

    it('should successfully update user', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser);

      const updateDto = { name: 'Updated Name', role: UserRole.REVIEWER };
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        ...updateDto,
      });
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.update(tenantId, userId, adminId, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(result.role).toBe(UserRole.REVIEWER);
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not admin', async () => {
      const nonAdmin = { ...mockAdmin, role: UserRole.USER };
      mockPrismaService.user.findFirst.mockResolvedValue(nonAdmin);

      await expect(
        service.update(tenantId, userId, adminId, { name: 'New Name' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent ADMIN from modifying SUPER_ADMIN', async () => {
      const superAdminUser = { ...mockUser, role: UserRole.SUPER_ADMIN };
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(superAdminUser);

      await expect(
        service.update(tenantId, userId, adminId, { name: 'New Name' })
      ).rejects.toThrow(new ForbiddenException('Admins cannot modify super admins'));
    });

    it('should prevent ADMIN from promoting to SUPER_ADMIN', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser);

      await expect(
        service.update(tenantId, userId, adminId, { role: UserRole.SUPER_ADMIN })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivate', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const adminId = 'admin-123';

    const mockAdmin = {
      id: adminId,
      tenantId,
      role: UserRole.ADMIN,
      deactivatedAt: null,
    };

    const mockUser = {
      id: userId,
      tenantId,
      email: 'user@test.com',
      role: UserRole.USER,
    };

    it('should successfully deactivate user', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser);

      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deactivatedAt: new Date(),
      });
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.deactivate(tenantId, userId, adminId);

      expect(result.message).toBe('User deactivated successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { deactivatedAt: expect.any(Date) },
      });
    });

    it('should prevent self-deactivation', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockAdmin);

      await expect(
        service.deactivate(tenantId, adminId, adminId)
      ).rejects.toThrow(new BadRequestException('Cannot deactivate your own account'));
    });

    it('should prevent ADMIN from deactivating SUPER_ADMIN', async () => {
      const superAdmin = { ...mockUser, role: UserRole.SUPER_ADMIN };
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(superAdmin);

      await expect(
        service.deactivate(tenantId, userId, adminId)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reactivate', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';
    const adminId = 'admin-123';

    const mockAdmin = {
      id: adminId,
      tenantId,
      role: UserRole.ADMIN,
      deactivatedAt: null,
    };

    const mockUser = {
      id: userId,
      tenantId,
      email: 'user@test.com',
      deactivatedAt: new Date(),
    };

    it('should successfully reactivate user', async () => {
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser);

      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deactivatedAt: null,
      });
      mockAuditService.log.mockResolvedValue(undefined);

      const result = await service.reactivate(tenantId, userId, adminId);

      expect(result.message).toBe('User reactivated successfully');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { deactivatedAt: null },
      });
    });

    it('should throw BadRequestException if user not deactivated', async () => {
      const activeUser = { ...mockUser, deactivatedAt: null };
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(activeUser);

      await expect(
        service.reactivate(tenantId, userId, adminId)
      ).rejects.toThrow(new BadRequestException('User is not deactivated'));
    });
  });

  describe('findAll', () => {
    const tenantId = 'tenant-123';

    it('should return all active users by default', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com', name: 'User 1', deactivatedAt: null },
        { id: 'user-2', email: 'user2@test.com', name: 'User 2', deactivatedAt: null },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll(tenantId);

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          deactivatedAt: null,
        },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should include deactivated users when requested', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com', deactivatedAt: null },
        { id: 'user-2', email: 'user2@test.com', deactivatedAt: new Date() },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      await service.findAll(tenantId, true);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    const tenantId = 'tenant-123';
    const userId = 'user-123';

    it('should return user if found', async () => {
      const mockUser = {
        id: userId,
        tenantId,
        email: 'user@test.com',
        name: 'Test User',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOne(tenantId, userId);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne(tenantId, userId)).rejects.toThrow(new NotFoundException('User not found'));
    });
  });
});
