import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { EmailService } from '../email/email.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { Prisma } from '@prisma/client';

/**
 * Story 1.2: Updated to use MagicLinkService for token validation
 */

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly magicLinkService: MagicLinkService
  ) {}

  /**
   * Register a new organization with initial admin user
   * Story 1.1: Multi-Tenant Organization Registration
   */
  async register(dto: CreateOrganizationDto) {
    // Check if organization or admin email already exists
    const existingOrg = await this.prisma.organization.findFirst({
      where: {
        name: dto.organizationName,
      },
    });

    if (existingOrg) {
      throw new ConflictException('Organization name already exists');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: dto.adminEmail,
      },
    });

    if (existingUser) {
      throw new ConflictException('Admin email already registered');
    }

    // Create organization and admin user in a transaction
    // Story 1.2: Magic link generation is now done outside transaction
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          industry: dto.industry,
          companySize: dto.companySize,
        },
      });

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          tenantId: organization.tenantId,
          email: dto.adminEmail,
          name: dto.adminName,
          role: 'ADMIN',
        },
      });

      return {
        organization,
        adminUser,
      };
    });

    // Story 1.2: Create verification token using centralized MagicLinkService
    const verificationToken = await this.emailService.createVerificationToken(
      result.organization.tenantId,
      dto.adminEmail
    );

    // Send welcome email with verification link
    await this.emailService.sendWelcomeEmail(
      dto.adminEmail,
      dto.adminName,
      dto.organizationName,
      verificationToken
    );

    // Return success response (without verification token)
    return {
      organizationId: result.organization.id,
      tenantId: result.organization.tenantId,
      organizationName: result.organization.name,
      adminEmail: dto.adminEmail,
      message: 'Organization created successfully. Please check your email to verify your account.',
    };
  }

  /**
   * Get organization by tenant ID
   */
  async findByTenantId(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId },
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

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Verify email and activate organization
   * Story 1.2: Updated to use MagicLinkService with enhanced security and audit trail
   *
   * @param token - Plain token from URL (not hash)
   * @param ipAddress - Optional IP address for audit logging
   * @param userAgent - Optional user agent for audit logging
   */
  async verifyEmail(
    token: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Story 1.2: Use centralized MagicLinkService for validation
    // This handles all security checks: expiration, one-time use, and audit logging
    const validationResult = await this.magicLinkService.validate(token, {
      ipAddress,
      userAgent,
    });

    // Handle validation failure
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

    // Get organization details
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId: validationResult.tenantId },
      select: { name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Mark user email as verified
    await this.prisma.user.updateMany({
      where: {
        tenantId: validationResult.tenantId,
        email: validationResult.email,
      },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    return {
      message: 'Email verified successfully',
      organizationName: organization.name,
      email: validationResult.email,
    };
  }
}
