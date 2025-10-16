import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from '../../common/services/audit.service';
import { PrismaService } from '../../common/services/prisma.service';
import { SessionService } from '../../common/services/session.service';
import { SessionMiddleware } from '../../common/middleware/session.middleware';

/**
 * Story 1.8: Audit Trail Module
 *
 * Provides comprehensive audit logging and trail viewing capabilities
 */
@Module({
  controllers: [AuditController],
  providers: [
    AuditService,
    PrismaService,
    SessionService,
    SessionMiddleware,
  ],
  exports: [AuditService],
})
export class AuditModule {}
