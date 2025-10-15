import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { MagicLinkService } from '@/common/services/magic-link.service';

/**
 * Story 1.2: Admin Controller for Magic Link Audit Logs
 *
 * Provides endpoints for administrators to view magic link access logs
 * and monitor security events.
 *
 * TODO: Add authentication guard when Auth module is implemented (Story 1.3)
 */
@Controller('admin/organizations')
// @UseGuards(AdminAuthGuard) // TODO: Uncomment when auth is implemented
export class OrganizationsAdminController {
  constructor(private readonly magicLinkService: MagicLinkService) {}

  /**
   * Get magic link access logs for an organization
   * GET /api/v1/admin/organizations/:tenantId/magic-link-logs
   *
   * Query Parameters:
   * - email: Filter by email address
   * - userId: Filter by user ID
   * - success: Filter by success/failure (true/false)
   * - startDate: Filter by start date (ISO 8601)
   * - endDate: Filter by end date (ISO 8601)
   * - limit: Number of records to return (default: 100, max: 1000)
   * - offset: Pagination offset (default: 0)
   *
   * Example:
   * GET /api/v1/admin/organizations/123e4567-e89b-12d3-a456-426614174000/magic-link-logs?success=false&limit=50
   */
  @Get(':tenantId/magic-link-logs')
  async getMagicLinkLogs(
    @Param('tenantId') tenantId: string,
    @Query('email') email?: string,
    @Query('userId') userId?: string,
    @Query('success') success?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    // Parse query parameters
    const filters: any = {};

    if (email) {
      filters.email = email;
    }

    if (userId) {
      filters.userId = userId;
    }

    if (success !== undefined) {
      filters.success = success === 'true';
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    if (limit) {
      filters.limit = Math.min(parseInt(limit, 10), 1000); // Max 1000 records
    }

    if (offset) {
      filters.offset = parseInt(offset, 10);
    }

    const logs = await this.magicLinkService.getAccessLogs(tenantId, filters);

    return {
      tenantId,
      totalRecords: logs.length,
      filters: {
        email: filters.email || null,
        userId: filters.userId || null,
        success: filters.success !== undefined ? filters.success : null,
        startDate: filters.startDate?.toISOString() || null,
        endDate: filters.endDate?.toISOString() || null,
        limit: filters.limit || 100,
        offset: filters.offset || 0,
      },
      logs,
    };
  }

  /**
   * Get magic link statistics for an organization
   * GET /api/v1/admin/organizations/:tenantId/magic-link-stats
   *
   * Returns statistics about magic link usage:
   * - Total links generated
   * - Total successful accesses
   * - Total failed accesses
   * - Breakdown by failure reason (expired, already used, invalid)
   */
  @Get(':tenantId/magic-link-stats')
  async getMagicLinkStats(@Param('tenantId') tenantId: string) {
    // Get all logs for the organization
    const allLogs = await this.magicLinkService.getAccessLogs(tenantId, {
      limit: 10000, // Get a large number for stats
    });

    // Calculate statistics
    const stats = {
      totalGenerated: 0,
      totalAccessAttempts: 0,
      successfulAccesses: 0,
      failedAccesses: 0,
      failureReasons: {
        expired: 0,
        alreadyUsed: 0,
        invalidToken: 0,
      },
    };

    allLogs.forEach((log: any) => {
      if (log.action === 'MAGIC_LINK_GENERATED') {
        stats.totalGenerated++;
      } else if (log.action === 'MAGIC_LINK_ACCESS_SUCCESS') {
        stats.totalAccessAttempts++;
        stats.successfulAccesses++;
      } else if (log.action === 'MAGIC_LINK_ACCESS_FAILED') {
        stats.totalAccessAttempts++;
        stats.failedAccesses++;

        const reason = log.metadata?.reason;
        if (reason === 'EXPIRED') {
          stats.failureReasons.expired++;
        } else if (reason === 'ALREADY_USED') {
          stats.failureReasons.alreadyUsed++;
        } else if (reason === 'INVALID_TOKEN') {
          stats.failureReasons.invalidToken++;
        }
      }
    });

    // Calculate success rate
    const successRate =
      stats.totalAccessAttempts > 0
        ? ((stats.successfulAccesses / stats.totalAccessAttempts) * 100).toFixed(2)
        : '0.00';

    return {
      tenantId,
      statistics: {
        ...stats,
        successRate: `${successRate}%`,
      },
    };
  }
}
