import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuditService, AuditLogQuery } from '../../common/services/audit.service';
import { SessionMiddleware } from '../../common/middleware/session.middleware';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

/**
 * Story 1.8: Audit Trail Controller
 *
 * Provides admin endpoints for:
 * - Viewing and filtering audit logs
 * - Exporting audit logs to CSV
 * - Recording access history
 */
@Controller('audit')
@UseGuards(SessionMiddleware, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Query audit logs with filtering and pagination
   * Story 1.8: AC5 - Admin Audit Trail Viewer
   *
   * @param tenantId - Current user's tenant ID
   * @param userId - Optional filter by user ID
   * @param action - Optional filter by action type
   * @param resourceType - Optional filter by resource type
   * @param resourceId - Optional filter by resource ID
   * @param startDate - Optional filter by start date
   * @param endDate - Optional filter by end date
   * @param page - Page number (default: 1)
   * @param limit - Results per page (default: 100)
   */
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAuditLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Build query parameters
    const query: AuditLogQuery = {
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 100,
    };

    // Parse dates if provided
    if (startDate) {
      query.startDate = new Date(startDate);
      if (isNaN(query.startDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    }

    if (endDate) {
      query.endDate = new Date(endDate);
      if (isNaN(query.endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    }

    // Query audit logs
    const result = await this.auditService.query(query);

    return {
      success: true,
      ...result,
    };
  }

  /**
   * Export audit logs to CSV
   * Story 1.8: AC5 - Admin Audit Trail Viewer
   *
   * @param tenantId - Current user's tenant ID
   * @param res - Express response for CSV download
   */
  @Get('export')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async exportAuditLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response,
  ) {
    // Build query parameters
    const query: AuditLogQuery = {
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
    };

    // Parse dates if provided
    if (startDate) {
      query.startDate = new Date(startDate);
      if (isNaN(query.startDate.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    }

    if (endDate) {
      query.endDate = new Date(endDate);
      if (isNaN(query.endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    }

    // Generate CSV
    const csv = await this.auditService.exportToCsv(query);

    // Set headers for CSV download
    if (!res) {
      throw new BadRequestException('Response object not available');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString()}.csv"`,
    );
    res.send(csv);
  }

  /**
   * Get recording access history
   * Story 1.8: AC3 - Recording Access Audit
   *
   * @param recordingId - Recording ID
   * @param tenantId - Current user's tenant ID
   */
  @Get('recording/:recordingId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.REVIEWER)
  @HttpCode(HttpStatus.OK)
  async getRecordingAccessHistory(
    @Param('recordingId') recordingId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const history = await this.auditService.getRecordingAccessHistory(
      recordingId,
      tenantId,
    );

    return {
      success: true,
      recordingId,
      accessHistory: history,
    };
  }
}
