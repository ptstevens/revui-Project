import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';

/**
 * Story 1.7: Session Management Service
 *
 * Provides secure session management with:
 * - httpOnly cookie sessions
 * - Multi-device support
 * - 24-hour expiration
 * - Automatic session cleanup
 */
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a cryptographically secure session token
   * Similar to magic link token generation (256-bit)
   */
  private generateSessionToken(): { token: string; tokenHash: string } {
    // Generate 256-bit random token
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('base64url'); // URL-safe encoding

    // Hash token for database storage (SHA-256)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return { token, tokenHash };
  }

  /**
   * Create a new session after successful authentication
   * Story 1.7: AC1 - Session Creation
   *
   * @param userId - User ID
   * @param tenantId - Organization tenant ID
   * @param ipAddress - Request IP address
   * @param userAgent - Request user agent
   * @param deviceName - Optional device name
   * @returns Plain session token (to be stored in httpOnly cookie)
   */
  async create(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceName?: string
  ): Promise<string> {
    const { token, tokenHash } = this.generateSessionToken();

    // Session expires in 24 hours (configurable)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        tenantId,
        userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
        deviceName,
      },
    });

    return token; // Return plain token (will be stored in httpOnly cookie)
  }

  /**
   * Validate a session token
   * Story 1.7: AC2 - Session Validation
   *
   * @param token - Plain session token from cookie
   * @returns Session data with user info, or null if invalid
   */
  async validate(token: string): Promise<{
    success: boolean;
    userId?: string;
    tenantId?: string;
    sessionId?: string;
    error?: string;
  }> {
    // Hash the token to match database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    // Check if session exists
    if (!session) {
      return {
        success: false,
        error: 'Invalid session token',
      };
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      return {
        success: false,
        error: 'Session expired',
      };
    }

    // Check if session was logged out
    if (session.loggedOutAt) {
      return {
        success: false,
        error: 'Session already logged out',
      };
    }

    // Update last activity timestamp
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      success: true,
      userId: session.userId,
      tenantId: session.tenantId,
      sessionId: session.id,
    };
  }

  /**
   * Invalidate a session (logout)
   * Story 1.7: AC3 - Session Termination
   *
   * @param token - Session token
   */
  async invalidate(token: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.prisma.session.updateMany({
      where: {
        tokenHash,
        loggedOutAt: null, // Only update active sessions
      },
      data: {
        loggedOutAt: new Date(),
      },
    });
  }

  /**
   * Invalidate a session by session ID
   * Story 1.7: AC4 - Multi-Device Session Management
   *
   * @param sessionId - Session ID to invalidate
   */
  async invalidateById(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        loggedOutAt: null, // Only update active sessions
      },
      data: {
        loggedOutAt: new Date(),
      },
    });
  }

  /**
   * Invalidate all sessions for a user
   * Useful for security actions (password reset, account compromise)
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   */
  async invalidateAllForUser(userId: string, tenantId: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        tenantId,
        loggedOutAt: null,
      },
      data: {
        loggedOutAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get all active sessions for a user
   * Story 1.7: AC4 - Multi-Device Session Management
   *
   * @param userId - User ID
   * @param tenantId - Tenant ID
   */
  async getActiveSessions(userId: string, tenantId: string) {
    return await this.prisma.session.findMany({
      where: {
        userId,
        tenantId,
        loggedOutAt: null,
        expiresAt: {
          gte: new Date(),
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
  }

  /**
   * Cleanup expired sessions
   * Should be run via a cron job daily
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            loggedOutAt: {
              not: null,
            },
            // Delete logged out sessions older than 30 days
            createdAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
    });

    return result.count;
  }
}
