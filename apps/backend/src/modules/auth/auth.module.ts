import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { SessionService } from '../../common/services/session.service';
import { SessionMiddleware } from '../../common/middleware/session.middleware';
import { MagicLinkService } from '../../common/services/magic-link.service';
import { PrismaService } from '../../common/services/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../../common/services/audit.service';

/**
 * Story 1.7: Authentication & Session Management Module
 * Story 1.8: Enhanced with audit logging
 *
 * Provides:
 * - Session-based authentication with httpOnly cookies
 * - Multi-device session management
 * - Login via magic links
 * - Session validation middleware
 * - Comprehensive audit logging for authentication events
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    PrismaService,
    SessionService,
    SessionMiddleware,
    MagicLinkService,
    EmailService,
    AuditService,
  ],
  controllers: [AuthController],
  exports: [JwtModule, SessionService, SessionMiddleware],
})
export class AuthModule {}
