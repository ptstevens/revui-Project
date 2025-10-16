import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '@/common/services/prisma.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { AuditService } from '@/common/services/audit.service';
import { EmailModule } from '../email/email.module';

/**
 * Story 1.3: User Invitation & Role Assignment Module
 * Story 1.8: Enhanced with audit trail integration
 */
@Module({
  imports: [EmailModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService, MagicLinkService, AuditService],
  exports: [UsersService],
})
export class UsersModule {}
