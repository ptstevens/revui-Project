import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsAdminController } from './organizations-admin.controller';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@/common/services/prisma.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Story 1.2: Updated to provide MagicLinkService and admin endpoints
 * Story 1.8: Import AuditModule for MagicLinkService dependency
 */
@Module({
  imports: [EmailModule, AuditModule],
  controllers: [OrganizationsController, OrganizationsAdminController],
  providers: [OrganizationsService, PrismaService, MagicLinkService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
