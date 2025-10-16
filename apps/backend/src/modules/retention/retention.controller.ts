import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { RetentionPolicyService } from '../../common/services/retention-policy.service';
import { SessionMiddleware } from '../../common/middleware/session.middleware';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

/**
 * Story 1.5: Retention Policy Controller
 *
 * Provides endpoints for:
 * - Organization-level retention policy management
 * - Legal hold application/removal
 * - Manual recording deletion
 * - Retention policy information and statistics
 */
@Controller('retention')
@UseGuards(SessionMiddleware)
export class RetentionController {
  constructor(
    private readonly retentionPolicyService: RetentionPolicyService,
  ) {}

  /**
   * Get retention policy info for current organization
   * AC1: View organization retention settings
   *
   * @param tenantId - Current organization tenant ID (from session)
   */
  @Get('policy')
  async getRetentionPolicy(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const policyInfo = await this.retentionPolicyService.getRetentionPolicyInfo(tenantId);

    return {
      success: true,
      data: policyInfo,
    };
  }

  /**
   * Update organization retention policy
   * AC1: Organization-level retention settings (SUPER_ADMIN only)
   *
   * @param tenantId - Current organization tenant ID (from session)
   * @param userId - Current user ID (from session)
   * @param role - Current user role (from session)
   * @param retentionDays - New retention period in days
   */
  @Put('policy')
  @HttpCode(HttpStatus.OK)
  async updateRetentionPolicy(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('retentionDays') retentionDays: number,
  ) {
    // Only SUPER_ADMIN can update organization retention policy
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can update organization retention policy');
    }

    // Validate retention days (must be positive)
    if (!retentionDays || retentionDays < 1) {
      throw new ForbiddenException('Retention days must be a positive number');
    }

    await this.retentionPolicyService.updateOrganizationRetention(
      tenantId,
      retentionDays,
      userId,
    );

    return {
      success: true,
      message: 'Organization retention policy updated successfully',
      data: {
        retentionDays,
      },
    };
  }

  /**
   * Apply legal hold to a recording
   * AC3: Legal hold capability (ADMIN/SUPER_ADMIN only)
   *
   * @param recordingId - Recording ID
   * @param userId - Current user ID (from session)
   * @param role - Current user role (from session)
   * @param reason - Reason for applying legal hold
   */
  @Post('recordings/:recordingId/legal-hold')
  @HttpCode(HttpStatus.OK)
  async applyLegalHold(
    @Param('recordingId') recordingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('reason') reason: string,
  ) {
    // Only ADMIN or SUPER_ADMIN can apply legal hold
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can apply legal hold');
    }

    if (!reason) {
      throw new ForbiddenException('Legal hold reason is required');
    }

    await this.retentionPolicyService.applyLegalHold(recordingId, {
      reason,
      appliedBy: userId,
    });

    return {
      success: true,
      message: 'Legal hold applied successfully',
    };
  }

  /**
   * Remove legal hold from a recording
   * AC3: Legal hold management (ADMIN/SUPER_ADMIN only)
   *
   * @param recordingId - Recording ID
   * @param userId - Current user ID (from session)
   * @param role - Current user role (from session)
   */
  @Delete('recordings/:recordingId/legal-hold')
  @HttpCode(HttpStatus.OK)
  async removeLegalHold(
    @Param('recordingId') recordingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    // Only ADMIN or SUPER_ADMIN can remove legal hold
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can remove legal hold');
    }

    await this.retentionPolicyService.removeLegalHold(recordingId, userId);

    return {
      success: true,
      message: 'Legal hold removed successfully',
    };
  }

  /**
   * Set retention override for a specific recording
   * AC2: Recording-level retention override (ADMIN/SUPER_ADMIN only)
   *
   * @param recordingId - Recording ID
   * @param userId - Current user ID (from session)
   * @param role - Current user role (from session)
   * @param retentionDays - Override retention period in days
   */
  @Put('recordings/:recordingId/retention')
  @HttpCode(HttpStatus.OK)
  async setRecordingRetentionOverride(
    @Param('recordingId') recordingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('retentionDays') retentionDays: number,
  ) {
    // Only ADMIN or SUPER_ADMIN can set retention override
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can set retention override');
    }

    // Validate retention days (must be positive)
    if (!retentionDays || retentionDays < 1) {
      throw new ForbiddenException('Retention days must be a positive number');
    }

    await this.retentionPolicyService.setRecordingRetentionOverride(
      recordingId,
      retentionDays,
      userId,
    );

    return {
      success: true,
      message: 'Recording retention override applied successfully',
      data: {
        retentionDays,
      },
    };
  }

  /**
   * Manually delete an expired recording
   * AC5: Manual deletion with confirmation (SUPER_ADMIN only)
   *
   * @param recordingId - Recording ID
   * @param userId - Current user ID (from session)
   * @param role - Current user role (from session)
   * @param confirmed - Confirmation flag (must be true)
   * @param force - Force delete even if not expired (requires explicit confirmation)
   */
  @Delete('recordings/:recordingId')
  @HttpCode(HttpStatus.OK)
  async deleteRecording(
    @Param('recordingId') recordingId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('confirmed') confirmed: boolean,
    @Body('force') force: boolean = false,
  ) {
    // Only SUPER_ADMIN can manually delete recordings
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can manually delete recordings');
    }

    // Require explicit confirmation
    if (!confirmed) {
      throw new ForbiddenException('Deletion must be explicitly confirmed');
    }

    await this.retentionPolicyService.deleteRecording(
      recordingId,
      userId,
      force,
    );

    return {
      success: true,
      message: 'Recording deleted successfully',
    };
  }

  /**
   * Get recordings eligible for deletion
   * AC4: View recordings that can be automatically deleted
   *
   * @param role - Current user role (from session)
   * @param limit - Maximum number of recordings to return
   */
  @Get('eligible-for-deletion')
  async getRecordingsEligibleForDeletion(
    @CurrentUser('role') role: UserRole,
    @Body('limit') limit: number = 100,
  ) {
    // Only ADMIN or SUPER_ADMIN can view eligible recordings
    if (role !== UserRole.ADMIN && role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only ADMIN or SUPER_ADMIN can view eligible recordings');
    }

    const recordingIds = await this.retentionPolicyService.findRecordingsEligibleForDeletion(limit);

    return {
      success: true,
      data: {
        count: recordingIds.length,
        recordingIds,
      },
    };
  }

  /**
   * Recalculate scheduled deletions for all recordings in organization
   * AC4: Admin utility to recalculate deletion dates (SUPER_ADMIN only)
   *
   * @param tenantId - Current organization tenant ID (from session)
   * @param role - Current user role (from session)
   */
  @Post('recalculate-deletions')
  @HttpCode(HttpStatus.OK)
  async recalculateScheduledDeletions(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    // Only SUPER_ADMIN can recalculate deletions
    if (role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN can recalculate scheduled deletions');
    }

    const updateCount = await this.retentionPolicyService.recalculateScheduledDeletions(tenantId);

    return {
      success: true,
      message: `Recalculated scheduled deletions for ${updateCount} recording(s)`,
      data: {
        updateCount,
      },
    };
  }
}
