import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  Ip,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { SessionService } from '../../common/services/session.service';
import { MagicLinkService } from '../../common/services/magic-link.service';
import { AuditService } from '../../common/services/audit.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionMiddleware } from '../../common/middleware/session.middleware';

/**
 * Story 1.7: Authentication & Session Management Controller
 * Story 1.8: Enhanced with audit logging
 *
 * Provides endpoints for:
 * - Login via magic link (creates httpOnly cookie session)
 * - Logout (invalidates session)
 * - Multi-device session management
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly magicLinkService: MagicLinkService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Login endpoint - Validates magic link token and creates session
   * Story 1.7: AC1 - Session Creation
   *
   * @param token - Magic link token
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param deviceName - Optional device name
   * @param res - Express response for setting cookie
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body('token') token: string,
    @Body('deviceName') deviceName: string | undefined,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Validate magic link token
    const magicLinkResult = await this.magicLinkService.validate(token, {
      ipAddress,
      userAgent,
    });

    if (!magicLinkResult.success) {
      throw new UnauthorizedException(
        magicLinkResult.error || 'Invalid magic link token',
      );
    }

    // Create session
    const sessionToken = await this.sessionService.create(
      magicLinkResult.userId!,
      magicLinkResult.tenantId!,
      ipAddress,
      userAgent,
      deviceName,
    );

    // Set httpOnly cookie with session token
    // Story 1.7: AC1 - httpOnly cookie security
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/', // Available to all routes
    });

    // Story 1.8: Log successful authentication
    await this.auditService.logAuth(
      'LOGIN',
      magicLinkResult.tenantId!,
      magicLinkResult.userId!,
      ipAddress,
      userAgent,
      { deviceName },
    );

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: magicLinkResult.userId,
        email: magicLinkResult.email,
        name: magicLinkResult.name,
        role: magicLinkResult.role,
      },
    };
  }

  /**
   * Logout endpoint - Invalidates current session
   * Story 1.7: AC3 - Session Termination
   * Story 1.8: Enhanced with audit logging
   *
   * @param req - Request with session cookie
   * @param res - Express response for clearing cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const sessionToken = res.req.cookies?.['sessionToken'];

    if (sessionToken) {
      // Validate session to get user info for audit log
      const sessionInfo = await this.sessionService.validate(sessionToken);

      // Invalidate session in database
      await this.sessionService.invalidate(sessionToken);

      // Story 1.8: Log logout event
      if (sessionInfo.success && sessionInfo.userId && sessionInfo.tenantId) {
        await this.auditService.logAuth(
          'LOGOUT',
          sessionInfo.tenantId,
          sessionInfo.userId,
          ipAddress,
          userAgent,
        );
      }
    }

    // Clear session cookie
    res.clearCookie('sessionToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  /**
   * Get all active sessions for current user
   * Story 1.7: AC4 - Multi-Device Session Management
   *
   * @param userId - Current user ID (from session middleware)
   * @param tenantId - Current tenant ID (from session middleware)
   */
  @Get('sessions')
  @UseGuards(SessionMiddleware)
  async getSessions(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const sessions = await this.sessionService.getActiveSessions(
      userId,
      tenantId,
    );

    return {
      success: true,
      sessions,
    };
  }

  /**
   * Invalidate a specific session by ID
   * Story 1.7: AC4 - Multi-Device Session Management
   *
   * @param sessionId - Session ID to invalidate
   * @param userId - Current user ID (from session middleware)
   * @param tenantId - Current tenant ID (from session middleware)
   */
  @Delete('sessions/:sessionId')
  @UseGuards(SessionMiddleware)
  @HttpCode(HttpStatus.OK)
  async invalidateSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    // Verify the session belongs to the current user
    const sessions = await this.sessionService.getActiveSessions(
      userId,
      tenantId,
    );
    const sessionToDelete = sessions.find((s) => s.id === sessionId);

    if (!sessionToDelete) {
      throw new UnauthorizedException(
        'Session not found or does not belong to you',
      );
    }

    // Invalidate the session by ID
    await this.sessionService.invalidateById(sessionToDelete.id);

    return {
      success: true,
      message: 'Session invalidated successfully',
    };
  }

  /**
   * Logout from all devices (invalidate all sessions)
   * Story 1.7: Security feature for account compromise
   * Story 1.8: Enhanced with audit logging
   *
   * @param userId - Current user ID (from session middleware)
   * @param tenantId - Current tenant ID (from session middleware)
   * @param res - Express response for clearing cookie
   */
  @Post('logout-all')
  @UseGuards(SessionMiddleware)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Res({ passthrough: true }) res: Response,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // Invalidate all sessions for user
    const count = await this.sessionService.invalidateAllForUser(
      userId,
      tenantId,
    );

    // Clear session cookie
    res.clearCookie('sessionToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    // Story 1.8: Log logout from all devices
    await this.auditService.logAuth(
      'LOGOUT',
      tenantId,
      userId,
      ipAddress,
      userAgent,
      { logoutAll: true, deviceCount: count },
    );

    return {
      success: true,
      message: `Logged out from ${count} device(s)`,
      count,
    };
  }
}
