import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { PrismaService } from '@/common/services/prisma.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Story 1.2: Updated to provide MagicLinkService for centralized token management
 * Story 1.8: Import AuditModule for MagicLinkService dependency
 */
@Module({
  imports: [AuditModule],
  providers: [EmailService, PrismaService, MagicLinkService],
  exports: [EmailService],
})
export class EmailModule {}
