import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { PrismaService } from '@/common/services/prisma.service';
import { MagicLinkService } from '@/common/services/magic-link.service';

/**
 * Story 1.2: Updated to provide MagicLinkService for centralized token management
 */
@Module({
  providers: [EmailService, PrismaService, MagicLinkService],
  exports: [EmailService],
})
export class EmailModule {}
