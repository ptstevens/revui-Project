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
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Response } from 'express';
import { SessionService } from '../../common/services/session.service';
import { MagicLinkService } from '../../common/services/magic-link.service';
import { AuditService } from '../../common/services/audit.service';
import { PasswordService } from '../../common/services/password.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SessionMiddleware } from '../../common/middleware/session.middleware';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../../common/services/prisma.service';
import { UserRole } from '@prisma/client';

/**
 * Story 1.7: Authentication & Session Management Controller
 * Story 1.8: Enhanced with audit logging
 * Refactor: Added password-based authentication
 *
 * Provides endpoints for:
 * - Signup with email/password (creates organization + user)
 * - Login with email/password (creates httpOnly cookie session)
 * - Login via magic link (for task recipients)
 * - Logout (invalidates session)
 * - Multi-device session management
 * - Password management
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly magicLinkService: MagicLinkService,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Signup endpoint - Register new organization with email/password
   * Refactor: New password-based authentication
   *
   * @param dto - Signup data (email, password, name, organizationName)
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param res - Express response for setting cookie
   */
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() dto: SignupDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Validate passwords match
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Validate password strength
    const passwordValidation = this.passwordService.validateStrength(dto.password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.message);
    }

    // Check if organization name already exists
    const existingOrg = await this.prisma.organization.findFirst({
      where: { name: dto.organizationName },
    });

    if (existingOrg) {
      throw new ConflictException('Organization name already exists');
    }

    // Check if email already registered
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await this.passwordService.hash(dto.password);

    // Create organization and admin user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
        },
      });

      // Create admin user with password
      const user = await tx.user.create({
        data: {
          tenantId: organization.tenantId,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: UserRole.ADMIN,
          invitationStatus: 'ACCEPTED', // Auto-accept for signup
          emailVerifiedAt: new Date(), // Auto-verify for signup
        },
      });

      return { organization, user };
    });

    // Create session
    const sessionToken = await this.sessionService.create(
      result.user.id,
      result.organization.tenantId,
      ipAddress,
      userAgent,
      undefined,
    );

    // Set httpOnly cookie
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // Log signup event
    await this.auditService.logAuth(
      'SIGNUP',
      result.organization.tenantId,
      result.user.id,
      ipAddress,
      userAgent,
      { method: 'password' },
    );

    return {
      success: true,
      message: 'Signup successful',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
      },
    };
  }

  /**
   * Login endpoint - Authenticate with email/password
   * Refactor: New password-based authentication
   *
   * @param dto - Login credentials (email, password)
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param res - Express response for setting cookie
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is deactivated
    if (user.deactivatedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create session
    const sessionToken = await this.sessionService.create(
      user.id,
      user.tenantId,
      ipAddress,
      userAgent,
      dto.deviceName,
    );

    // Set httpOnly cookie
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    });

    // Log login event
    await this.auditService.logAuth(
      'LOGIN',
      user.tenantId,
      user.id,
      ipAddress,
      userAgent,
      { method: 'password', deviceName: dto.deviceName },
    );

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Magic link login endpoint - For task recipients (guest access)
   * Validates magic link token and creates session
   * Story 1.7: AC1 - Session Creation
   *
   * @param token - Magic link token
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @param deviceName - Optional device name
   * @param res - Express response for setting cookie
   */
  @Post('magic-login')
  @HttpCode(HttpStatus.OK)
  async magicLogin(
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
   * Change password endpoint - Allows authenticated users to update their password
   * Refactor: New password management feature
   *
   * @param dto - Change password data (currentPassword, newPassword, confirmNewPassword)
   * @param userId - Current user ID (from session middleware)
   * @param tenantId - Current tenant ID (from session middleware)
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   */
  @Post('change-password')
  @UseGuards(SessionMiddleware)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // Validate new passwords match
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    // Validate new password strength
    const passwordValidation = this.passwordService.validateStrength(dto.newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.message);
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found or password not set');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.verify(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check new password is different from current
    const isSamePassword = await this.passwordService.verify(
      dto.newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hash(dto.newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Log password change
    await this.auditService.logAuth(
      'PASSWORD_CHANGE',
      tenantId,
      userId,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Password changed successfully',
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
