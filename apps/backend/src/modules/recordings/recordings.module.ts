import { Module } from '@nestjs/common';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';
import { PrismaService } from '@/common/services/prisma.service';
import { S3Service } from '@/common/services/s3.service';
import { RetentionPolicyService } from '@/common/services/retention-policy.service';
import { AuditService } from '@/common/services/audit.service';

/**
 * Story 1.4: Recordings Module
 * Story 1.5: Enhanced with retention policy integration
 *
 * Provides recording storage infrastructure with:
 * - Direct S3 uploads using pre-signed URLs
 * - Multi-tenant path isolation
 * - Secure download access
 * - Recording lifecycle management
 * - Automated retention policy application
 */
@Module({
  controllers: [RecordingsController],
  providers: [
    RecordingsService,
    PrismaService,
    S3Service,
    RetentionPolicyService,
    AuditService,
  ],
  exports: [RecordingsService],
})
export class RecordingsModule {}
