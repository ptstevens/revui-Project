import { Injectable, NotFoundException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import * as crypto from 'crypto';
import { LinkPurpose } from '@prisma/client';

export interface MagicLinkGenerateOptions {
  tenantId: string;
  email: string;
  purpose: LinkPurpose;
  userId?: string;
  taskId?: string;
  expirationHours?: number; // Override organization default if needed
}

export interface MagicLinkValidationResult {
  success: boolean;
  magicLinkId?: string;
  tenantId?: string;
  email?: string;
  userId?: string;
  name?: string;
  role?: string;
  taskId?: string;
  purpose?: LinkPurpose;
  error?: string;
  errorCode?: 'INVALID_TOKEN' | 'EXPIRED' | 'ALREADY_USED' | 'NOT_FOUND';
}

export interface AccessAttemptData {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Story 1.2: Enhanced Magic Link Service
 * Story 1.8: Enhanced with AuditService integration
 *
 * Provides centralized management of magic link tokens with:
 * - Cryptographically secure 256-bit token generation
 * - Configurable expiration times per organization
 * - One-time use enforcement
 * - Comprehensive audit logging via AuditService
 * - Enhanced error handling
 */
@Injectable()
export class MagicLinkService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate a cryptographically secure magic link token
   *
   * AC1: Cryptographically Secure Token Generation
   * - 256-bit random token (crypto.randomBytes(32))
   * - URL-safe base64url encoding
   * - SHA-256 hash for storage
   * - Database-level uniqueness enforcement
   */
  private generateToken(): { token: string; tokenHash: string } {
    // Generate 256-bit (32 bytes) cryptographically secure random token
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('base64url'); // URL-safe base64

    // Hash the token for storage (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return { token, tokenHash };
  }

  /**
   * Create a new magic link with configurable expiration
   *
   * @param options - Magic link generation options
   * @returns The plain token to send in email (NOT the hash)
   */
  async generate(options: MagicLinkGenerateOptions): Promise<string> {
    const { tenantId, email, purpose, userId, taskId, expirationHours } = options;

    // Generate token
    const { token, tokenHash } = this.generateToken();

    // Get organization's expiration setting if not overridden
    let expiresInHours = expirationHours;
    if (!expiresInHours) {
      const organization = await this.prisma.organization.findUnique({
        where: { tenantId },
        select: { magicLinkExpirationHours: true },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      expiresInHours = organization.magicLinkExpirationHours;
    }

    // Calculate expiration timestamp
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Create magic link record
    const magicLink = await this.prisma.magicLink.create({
      data: {
        tenantId,
        tokenHash,
        email,
        purpose,
        userId,
        taskId,
        expiresAt,
      },
    });

    // Story 1.8: Audit trail - Log magic link generation
    await this.auditService.logMagicLinkAccess(
      'MAGIC_LINK_SENT',
      tenantId,
      email,
      magicLink.id,
    );

    // Return plain token (to be sent in email)
    return token;
  }

  /**
   * Validate and consume a magic link token
   *
   * AC2: One-Time Use Enforcement
   * AC3: Time-Based Expiration
   * AC4: Audit Trail
   *
   * @param token - Plain token from URL
   * @param accessData - IP address and user agent for audit trail
   * @returns Validation result with details or error
   */
  async validate(
    token: string,
    accessData?: AccessAttemptData
  ): Promise<MagicLinkValidationResult> {
    // Hash the token to look up in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find magic link
    const magicLink = await this.prisma.magicLink.findUnique({
      where: { tokenHash },
    });

    // Validate token existence
    if (!magicLink) {
      // Story 1.8: Log failed access attempt (unknown token)
      // Note: We can't log with tenantId/userId since we don't have the magic link
      return {
        success: false,
        error: 'Invalid link. Please check the URL or contact your administrator.',
        errorCode: 'INVALID_TOKEN',
      };
    }

    // AC2: Check if already used
    if (magicLink.usedAt) {
      // Story 1.8: Log failed access attempt (already used)
      await this.auditService.logMagicLinkAccess(
        'MAGIC_LINK_FAILED',
        magicLink.tenantId,
        magicLink.email,
        magicLink.id,
        accessData?.ipAddress,
        accessData?.userAgent,
      );

      return {
        success: false,
        error: 'This link has already been used. Contact your administrator for a new link.',
        errorCode: 'ALREADY_USED',
      };
    }

    // AC3: Check if expired
    if (new Date() > magicLink.expiresAt) {
      // Story 1.8: Log failed access attempt (expired)
      await this.auditService.logMagicLinkAccess(
        'MAGIC_LINK_FAILED',
        magicLink.tenantId,
        magicLink.email,
        magicLink.id,
        accessData?.ipAddress,
        accessData?.userAgent,
      );

      return {
        success: false,
        error: 'This link has expired. Contact your administrator for a new link.',
        errorCode: 'EXPIRED',
      };
    }

    // Load user information if userId is present
    let userInfo: { name?: string; role?: string } = {};
    if (magicLink.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: magicLink.userId },
        select: { name: true, role: true },
      });
      if (user) {
        userInfo = { name: user.name, role: user.role };
      }
    }

    // Mark token as used and store access data
    await this.prisma.magicLink.update({
      where: { id: magicLink.id },
      data: {
        usedAt: new Date(),
        ipAddress: accessData?.ipAddress,
        userAgent: accessData?.userAgent,
      },
    });

    // Story 1.8: Log successful magic link access
    await this.auditService.logMagicLinkAccess(
      'MAGIC_LINK_USED',
      magicLink.tenantId,
      magicLink.email,
      magicLink.id,
      accessData?.ipAddress,
      accessData?.userAgent,
    );

    return {
      success: true,
      magicLinkId: magicLink.id,
      tenantId: magicLink.tenantId,
      email: magicLink.email,
      userId: magicLink.userId || undefined,
      name: userInfo.name,
      role: userInfo.role,
      taskId: magicLink.taskId || undefined,
      purpose: magicLink.purpose,
    };
  }

  /**
   * Get magic link access logs for admin panel
   *
   * @param tenantId - Filter by organization
   * @param filters - Optional filters (email, userId, success, dateRange)
   * @returns Array of audit log entries
   */
  async getAccessLogs(
    tenantId: string,
    filters?: {
      email?: string;
      userId?: string;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = {
      tenantId,
      action: {
        in: ['MAGIC_LINK_ACCESS_SUCCESS', 'MAGIC_LINK_ACCESS_FAILED', 'MAGIC_LINK_GENERATED'],
      },
    };

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    // Filter by success/failure if specified
    if (filters?.success !== undefined) {
      where.action = filters.success ? 'MAGIC_LINK_ACCESS_SUCCESS' : 'MAGIC_LINK_ACCESS_FAILED';
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    // Filter by email if specified (email is in metadata)
    if (filters?.email) {
      return logs.filter((log: any) => log.metadata?.email === filters.email);
    }

    return logs;
  }

  /**
   * Test token generation for uniqueness
   * Used for AC1 validation (generate 10,000+ tokens with no collisions)
   */
  async testTokenGeneration(count: number = 10000): Promise<{
    success: boolean;
    uniqueTokens: number;
    collisions: number;
  }> {
    const tokens = new Set<string>();
    const hashes = new Set<string>();

    for (let i = 0; i < count; i++) {
      const { token, tokenHash } = this.generateToken();
      tokens.add(token);
      hashes.add(tokenHash);
    }

    return {
      success: tokens.size === count && hashes.size === count,
      uniqueTokens: tokens.size,
      collisions: count - tokens.size,
    };
  }
}
