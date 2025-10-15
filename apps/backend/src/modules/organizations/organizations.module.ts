import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsAdminController } from './organizations-admin.controller';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@/common/services/prisma.service';
import { MagicLinkService } from '@/common/services/magic-link.service';
import { EmailModule } from '../email/email.module';

/**
 * Story 1.2: Updated to provide MagicLinkService and admin endpoints
 */
@Module({
  imports: [EmailModule],
  controllers: [OrganizationsController, OrganizationsAdminController],
  providers: [OrganizationsService, PrismaService, MagicLinkService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
