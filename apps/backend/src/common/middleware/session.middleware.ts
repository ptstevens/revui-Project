import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import { PrismaService } from '../services/prisma.service';
import { UserRole } from '@prisma/client';

// Extend Express Request to include session data
export interface RequestWithSession extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId: string;
  };
  sessionId?: string;
}

/**
 * Story 1.7: Session Validation Middleware
 *
 * Validates session tokens from httpOnly cookies and attaches user to request
 * - Extracts session token from cookie
 * - Validates session via SessionService
 * - Loads user data and attaches to request
 * - Throws UnauthorizedException on invalid/expired sessions
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: RequestWithSession, res: Response, next: NextFunction) {
    // Extract session token from httpOnly cookie
    const sessionToken = req.cookies?.['sessionToken'];

    if (!sessionToken) {
      throw new UnauthorizedException('No session token provided');
    }

    // Validate session
    const validationResult = await this.sessionService.validate(sessionToken);

    if (!validationResult.success) {
      throw new UnauthorizedException(validationResult.error || 'Invalid session');
    }

    // Load user data (ensure user is not deactivated)
    const user = await this.prisma.user.findFirst({
      where: {
        id: validationResult.userId,
        tenantId: validationResult.tenantId,
        deactivatedAt: null, // Only active users
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // Attach user and session to request for downstream use
    req.user = user;
    req.sessionId = validationResult.sessionId;

    next();
  }
}
