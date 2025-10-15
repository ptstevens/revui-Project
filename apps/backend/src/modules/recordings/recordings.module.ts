import { Module } from '@nestjs/common';
import { RecordingsController } from './recordings.controller';
import { RecordingsService } from './recordings.service';
import { PrismaService } from '@/common/services/prisma.service';
import { S3Service } from '@/common/services/s3.service';

/**
 * Story 1.4: Recordings Module
 *
 * Provides recording storage infrastructure with:
 * - Direct S3 uploads using pre-signed URLs
 * - Multi-tenant path isolation
 * - Secure download access
 * - Recording lifecycle management
 */
@Module({
  controllers: [RecordingsController],
  providers: [RecordingsService, PrismaService, S3Service],
  exports: [RecordingsService],
})
export class RecordingsModule {}
