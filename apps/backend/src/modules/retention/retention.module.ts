import { Module } from '@nestjs/common';
import { RetentionController } from './retention.controller';
import { RetentionPolicyService } from '../../common/services/retention-policy.service';
import { PrismaService } from '../../common/services/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { SessionService } from '../../common/services/session.service';
import { SessionMiddleware } from '../../common/middleware/session.middleware';

/**
 * Story 1.5: Retention Policy Module
 *
 * Provides data retention policy management capabilities:
 * - Organization-level retention configuration
 * - Recording-level retention overrides
 * - Legal hold management
 * - Manual and automated deletion enforcement
 */
@Module({
  controllers: [RetentionController],
  providers: [
    RetentionPolicyService,
    PrismaService,
    AuditService,
    SessionService,
    SessionMiddleware,
  ],
  exports: [RetentionPolicyService],
})
export class RetentionModule {}
