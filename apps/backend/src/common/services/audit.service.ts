import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Story 1.8: Audit Trail & Access Logging Service
 *
 * Provides comprehensive audit logging for:
 * - User authentication (login/logout)
 * - Resource changes (create/update/delete)
 * - Access tracking (who viewed what, when)
 * - Compliance (7-year retention)
 */

export interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  tenantId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit event
   * Story 1.8: AC1 - Comprehensive Audit Logging
   *
   * @param entry - Audit log entry details
   */
  async log(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        oldValue: entry.oldValue as Prisma.InputJsonValue,
        newValue: entry.newValue as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        metadata: entry.metadata as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Log user authentication events
   * Story 1.8: AC2 - Critical Actions Logged
   */
  async logAuth(
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    tenantId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      resourceType: 'SESSION',
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Log magic link access attempts
   * Story 1.8: AC2 - Critical Actions Logged
   */
  async logMagicLinkAccess(
    action: 'MAGIC_LINK_SENT' | 'MAGIC_LINK_USED' | 'MAGIC_LINK_FAILED',
    tenantId: string,
    email: string,
    magicLinkId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      action,
      resourceType: 'MAGIC_LINK',
      resourceId: magicLinkId,
      ipAddress,
      userAgent,
      metadata: { email },
    });
  }

  /**
   * Log resource changes (create/update/delete)
   * Story 1.8: AC2 - Critical Actions Logged
   */
  async logResourceChange(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tenantId: string,
    userId: string,
    resourceType: string,
    resourceId: string,
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      oldValue,
      newValue,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log recording access (who viewed it, when)
   * Story 1.8: AC3 - Recording Access Audit
   */
  async logRecordingAccess(
    tenantId: string,
    userId: string,
    recordingId: string,
    duration: number, // How long the recording was viewed (in seconds)
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      tenantId,
      userId,
      action: 'VIEW',
      resourceType: 'RECORDING',
      resourceId: recordingId,
      ipAddress,
      userAgent,
      metadata: {
        viewDurationSeconds: duration,
      },
    });
  }

  /**
   * Query audit logs with filtering and pagination
   * Story 1.8: AC5 - Admin Audit Trail Viewer
   *
   * @param query - Query parameters for filtering
   * @returns Paginated audit log results
   */
  async query(query: AuditLogQuery): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 100;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.AuditLogWhereInput = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.action) {
      where.action = query.action;
    }

    if (query.resourceType) {
      where.resourceType = query.resourceType;
    }

    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate;
      }
    }

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get recording access history
   * Story 1.8: AC3 - Recording Access Audit
   *
   * @param recordingId - Recording ID
   * @param tenantId - Tenant ID
   * @returns List of access events with user details
   */
  async getRecordingAccessHistory(recordingId: string, tenantId: string) {
    return await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        resourceType: 'RECORDING',
        resourceId: recordingId,
        action: 'VIEW',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Export audit logs to CSV format
   * Story 1.8: AC5 - Admin Audit Trail Viewer
   *
   * @param query - Query parameters for filtering
   * @returns CSV string
   */
  async exportToCsv(query: AuditLogQuery): Promise<string> {
    // Get all matching records (no pagination for export)
    const result = await this.query({ ...query, limit: 10000 });

    // CSV header
    const headers = [
      'Timestamp',
      'Tenant ID',
      'User ID',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Old Value',
      'New Value',
      'Metadata',
    ];

    const rows = result.data.map((log) => [
      log.createdAt.toISOString(),
      log.tenantId || '',
      log.userId || '',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.oldValue ? JSON.stringify(log.oldValue) : '',
      log.newValue ? JSON.stringify(log.newValue) : '',
      log.metadata ? JSON.stringify(log.metadata) : '',
    ]);

    // Escape CSV values
    const escapeCsvValue = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvLines = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(',')),
    ];

    return csvLines.join('\n');
  }

  /**
   * Clean up old audit logs (for 7-year retention policy)
   * Story 1.8: AC4 - Audit Trail Retention
   * Should be run via cron job
   *
   * @returns Number of deleted records
   */
  async cleanupOldAuditLogs(): Promise<number> {
    // Delete logs older than 7 years
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: sevenYearsAgo,
        },
      },
    });

    return result.count;
  }
}
