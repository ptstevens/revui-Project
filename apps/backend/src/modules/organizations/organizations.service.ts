import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { EmailService } from '../email/email.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
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

      // Create email verification magic link
      const verificationToken = await this.emailService.createVerificationToken(
        organization.tenantId,
        dto.adminEmail
      );

      return {
        organization,
        adminUser,
        verificationToken,
      };
    });

    // Send welcome email with verification link
    await this.emailService.sendWelcomeEmail(
      dto.adminEmail,
      dto.adminName,
      dto.organizationName,
      result.verificationToken
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
   */
  async verifyEmail(tokenHash: string) {
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { tokenHash },
      include: {
        organization: true,
      },
    });

    if (!magicLink) {
      throw new NotFoundException('Invalid verification link');
    }

    if (magicLink.usedAt) {
      throw new ConflictException('Verification link already used');
    }

    if (magicLink.expiresAt < new Date()) {
      throw new ConflictException('Verification link expired');
    }

    // Mark magic link as used and verify user email
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.magicLink.update({
        where: { id: magicLink.id },
        data: { usedAt: new Date() },
      });

      await tx.user.updateMany({
        where: {
          tenantId: magicLink.tenantId,
          email: magicLink.email,
        },
        data: {
          emailVerifiedAt: new Date(),
        },
      });
    });

    return {
      message: 'Email verified successfully',
      organizationName: magicLink.organization.name,
      email: magicLink.email,
    };
  }
}
