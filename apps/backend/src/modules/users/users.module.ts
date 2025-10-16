import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserPreferencesController } from './controllers/user-preferences.controller';
import { UsersService } from './users.service';
import { UserPreferencesService } from './services/user-preferences.service';
import { PrismaService } from '@/common/services/prisma.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Story 1.3: User Invitation & Role Assignment Module
 * Story 1.8: Enhanced with audit trail integration
 * Story 2.3: User Preferences Management
 */
@Module({
  imports: [EmailModule, AuditModule],
  controllers: [UsersController, UserPreferencesController],
  providers: [UsersService, UserPreferencesService, PrismaService, MagicLinkService],
  exports: [UsersService],
})
export class UsersModule {}
