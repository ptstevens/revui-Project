import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { SessionService } from '../../common/services/session.service';
import { SessionMiddleware } from '../../common/middleware/session.middleware';
import { MagicLinkService } from '../../common/services/magic-link.service';
import { PasswordService } from '../../common/services/password.service';
import { PrismaService } from '../../common/services/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Story 1.7: Authentication & Session Management Module
 * Story 1.8: Enhanced with audit logging
 * Refactor: Added password-based authentication
 *
 * Provides:
 * - Password-based signup and login
 * - Session-based authentication with httpOnly cookies
 * - Multi-device session management
 * - Login via magic links (for task recipients)
 * - Password management (change password)
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
    AuditModule,
  ],
  providers: [
    PrismaService,
    SessionService,
    SessionMiddleware,
    MagicLinkService,
    PasswordService,
    EmailService,
  ],
  controllers: [AuthController],
  exports: [JwtModule, SessionService, SessionMiddleware],
})
export class AuthModule {}
