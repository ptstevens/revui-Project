import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { EmailService } from '../email/email.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { BulkInviteUsersDto } from './dto/invite-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole, LinkPurpose, InvitationStatus, Prisma } from '@prisma/client';

/**
 * Story 1.3: User Invitation & Role Assignment Service
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly magicLinkService: MagicLinkService
  ) {}

  /**
   * Bulk invite users to an organization
   * Story 1.3: AC1 - Bulk Invitation System
   *
   * @param tenantId - The organization's tenant ID
   * @param invitedById - The user ID of the admin/super_admin inviting
   * @param dto - Bulk invitation data
   * @returns Summary of invitation results
   */
  async bulkInvite(
    tenantId: string,
    invitedById: string,
    dto: BulkInviteUsersDto
  ) {
    // Validate inviter has permission (ADMIN or SUPER_ADMIN)
    const inviter = await this.prisma.user.findFirst({
      where: {
        id: invitedById,
        tenantId,
        deactivatedAt: null,
      },
    });

    if (!inviter || (inviter.role !== UserRole.ADMIN && inviter.role !== UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only admins can invite users');
    }

    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId },
      select: { name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const results = {
      success: [] as Array<{ email: string; name: string; role: UserRole }>,
      failed: [] as Array<{ email: string; name: string; role: UserRole; reason: string }>,
    };

    // Process each invitation
    for (const userInvite of dto.users) {
      try {
        // Check if user already exists in this organization
        const existingUser = await this.prisma.user.findUnique({
          where: {
            tenantId_email: {
              tenantId,
              email: userInvite.email,
            },
          },
        });

        if (existingUser) {
          results.failed.push({
            ...userInvite,
            reason: 'User already exists in this organization',
          });
          continue;
        }

        // Create user with pending invitation status
        const newUser = await this.prisma.user.create({
          data: {
            tenantId,
            email: userInvite.email,
            name: userInvite.name,
            role: userInvite.role,
            invitedBy: invitedById,
            invitationStatus: InvitationStatus.PENDING,
          },
        });

        // Generate magic link for invitation
        const invitationToken = await this.magicLinkService.generate({
          tenantId,
          email: userInvite.email,
          purpose: LinkPurpose.INVITATION,
          userId: newUser.id,
        });

        // Send invitation email
        await this.emailService.sendInvitationEmail(
          userInvite.email,
          userInvite.name,
          organization.name,
          inviter.name,
          userInvite.role,
          invitationToken
        );

        // Log audit event
        await this.logAuditEvent({
          tenantId,
          userId: invitedById,
          action: 'USER_INVITED',
          resource: 'user',
          metadata: {
            invitedUserId: newUser.id,
            invitedEmail: userInvite.email,
            role: userInvite.role,
          },
        });

        results.success.push(userInvite);
      } catch (error) {
        results.failed.push({
          ...userInvite,
          reason: error.message || 'Unknown error',
        });
      }
    }

    return {
      total: dto.users.length,
      successful: results.success.length,
      failed: results.failed.length,
      results,
    };
  }

  /**
   * Accept an invitation via magic link
   * Story 1.3: AC2 - User completes invitation
   *
   * @param token - Magic link token
   * @param ipAddress - Optional IP address for audit
   * @param userAgent - Optional user agent for audit
   */
  async acceptInvitation(
    token: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Validate magic link
    const validationResult = await this.magicLinkService.validate(token, {
      ipAddress,
      userAgent,
    });

    if (!validationResult.success) {
      switch (validationResult.errorCode) {
        case 'INVALID_TOKEN':
          throw new NotFoundException(validationResult.error);
        case 'ALREADY_USED':
        case 'EXPIRED':
          throw new BadRequestException(validationResult.error);
        default:
          throw new BadRequestException('Token validation failed');
      }
    }

    // Verify it's an invitation link
    if (validationResult.purpose !== LinkPurpose.INVITATION) {
      throw new BadRequestException('Invalid invitation link');
    }

    // Ensure tenantId and userId are present
    if (!validationResult.tenantId || !validationResult.userId) {
      throw new BadRequestException('Invalid validation result - missing tenant or user information');
    }

    // Update user invitation status
    const user = await this.prisma.user.updateMany({
      where: {
        tenantId: validationResult.tenantId,
        email: validationResult.email,
        invitationStatus: InvitationStatus.PENDING,
      },
      data: {
        invitationStatus: InvitationStatus.ACCEPTED,
        emailVerifiedAt: new Date(),
      },
    });

    if (user.count === 0) {
      throw new NotFoundException('Invitation not found or already accepted');
    }

    // Get organization details
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId: validationResult.tenantId },
      select: { name: true },
    });

    // Log audit event
    await this.logAuditEvent({
      tenantId: validationResult.tenantId,
      userId: validationResult.userId,
      action: 'INVITATION_ACCEPTED',
      resource: 'user',
      ipAddress,
      userAgent,
      metadata: {
        email: validationResult.email,
      },
    });

    return {
      message: 'Invitation accepted successfully',
      organizationName: organization?.name,
      email: validationResult.email,
    };
  }

  /**
   * Get all users in an organization
   * Story 1.3: AC3 - User List Management
   *
   * @param tenantId - Organization tenant ID
   * @param includeDeactivated - Include deactivated users in results
   */
  async findAll(tenantId: string, includeDeactivated: boolean = false) {
    const where: Prisma.UserWhereInput = { tenantId };

    if (!includeDeactivated) {
      where.deactivatedAt = null;
    }

    return await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        invitationStatus: true,
        emailVerifiedAt: true,
        deactivatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single user by ID
   *
   * @param tenantId - Organization tenant ID
   * @param userId - User ID
   */
  async findOne(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        invitationStatus: true,
        invitedBy: true,
        emailVerifiedAt: true,
        deactivatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update a user's role or information
   * Story 1.3: AC4 - Role Management
   *
   * @param tenantId - Organization tenant ID
   * @param userId - User ID to update
   * @param adminId - ID of admin making the change
   * @param dto - Update data
   */
  async update(
    tenantId: string,
    userId: string,
    adminId: string,
    dto: UpdateUserDto
  ) {
    // Validate admin has permission
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        tenantId,
        deactivatedAt: null,
      },
    });

    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only admins can update users');
    }

    // Find user to update
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent ADMIN from modifying SUPER_ADMIN
    if (admin.role === UserRole.ADMIN && user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admins cannot modify super admins');
    }

    // Prevent ADMIN from promoting users to SUPER_ADMIN
    if (admin.role === UserRole.ADMIN && dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can promote users to super admin');
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });

    // Log audit event
    await this.logAuditEvent({
      tenantId,
      userId: adminId,
      action: 'USER_UPDATED',
      resource: 'user',
      metadata: {
        targetUserId: userId,
        changes: dto,
      },
    });

    return updatedUser;
  }

  /**
   * Deactivate a user (soft delete)
   * Story 1.3: AC5 - User Deactivation
   *
   * @param tenantId - Organization tenant ID
   * @param userId - User ID to deactivate
   * @param adminId - ID of admin making the change
   */
  async deactivate(tenantId: string, userId: string, adminId: string) {
    // Validate admin has permission
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        tenantId,
        deactivatedAt: null,
      },
    });

    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only admins can deactivate users');
    }

    // Find user to deactivate
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent ADMIN from deactivating SUPER_ADMIN
    if (admin.role === UserRole.ADMIN && user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admins cannot deactivate super admins');
    }

    // Prevent self-deactivation
    if (userId === adminId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    // Deactivate user
    await this.prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: new Date() },
    });

    // Log audit event
    await this.logAuditEvent({
      tenantId,
      userId: adminId,
      action: 'USER_DEACTIVATED',
      resource: 'user',
      metadata: {
        targetUserId: userId,
        targetEmail: user.email,
      },
    });

    return {
      message: 'User deactivated successfully',
    };
  }

  /**
   * Reactivate a deactivated user
   *
   * @param tenantId - Organization tenant ID
   * @param userId - User ID to reactivate
   * @param adminId - ID of admin making the change
   */
  async reactivate(tenantId: string, userId: string, adminId: string) {
    // Validate admin has permission
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        tenantId,
        deactivatedAt: null,
      },
    });

    if (!admin || (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Only admins can reactivate users');
    }

    // Find user to reactivate
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.deactivatedAt) {
      throw new BadRequestException('User is not deactivated');
    }

    // Reactivate user
    await this.prisma.user.update({
      where: { id: userId },
      data: { deactivatedAt: null },
    });

    // Log audit event
    await this.logAuditEvent({
      tenantId,
      userId: adminId,
      action: 'USER_REACTIVATED',
      resource: 'user',
      metadata: {
        targetUserId: userId,
        targetEmail: user.email,
      },
    });

    return {
      message: 'User reactivated successfully',
    };
  }

  /**
   * Helper: Log audit event
   */
  private async logAuditEvent(data: {
    tenantId: string;
    userId?: string;
    action: string;
    resource: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    await this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId || null,
        action: data.action,
        resource: data.resource,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata || {},
      },
    });
  }
}
