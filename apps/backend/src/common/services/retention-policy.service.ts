import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';

export interface RetentionPolicyOptions {
  organizationRetentionDays?: number;
  recordingRetentionOverrideDays?: number;
  createdAt: Date;
}

export interface LegalHoldOptions {
  reason: string;
  appliedBy: string;
}

/**
 * Story 1.5: Retention Policy Service
 *
 * Provides centralized management of data retention policies with:
 * - Organization-level default retention periods
 * - Recording-level retention overrides
 * - Legal hold capability (exempts from deletion)
 * - Scheduled deletion calculation and enforcement
 * - Comprehensive audit logging
 */
@Injectable()
export class RetentionPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuditService))
    private readonly auditService: AuditService,
  ) {}

  /**
   * Calculate scheduled deletion date for a recording
   *
   * AC1: Uses recording override if set, otherwise organization default
   *
   * @param options - Retention policy options
   * @returns Scheduled deletion date
   */
  calculateScheduledDeletion(options: RetentionPolicyOptions): Date {
    const retentionDays = options.recordingRetentionOverrideDays || options.organizationRetentionDays || 180;

    const scheduledDeletionAt = new Date(options.createdAt);
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + retentionDays);

    return scheduledDeletionAt;
  }

  /**
   * Update organization retention policy
   *
   * AC1: Organization-level retention settings
   *
   * @param tenantId - Organization tenant ID
   * @param retentionDays - Retention period in days (90, 180, 365, 730, or custom)
   * @param userId - User making the change (for audit)
   */
  async updateOrganizationRetention(
    tenantId: string,
    retentionDays: number,
    userId: string,
  ): Promise<void> {
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const oldValue = { defaultRetentionDays: organization.defaultRetentionDays };
    const newValue = { defaultRetentionDays: retentionDays };

    // Update organization
    await this.prisma.organization.update({
      where: { tenantId },
      data: { defaultRetentionDays: retentionDays },
    });

    // Audit trail
    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'ORGANIZATION',
      resourceId: organization.id,
      oldValue,
      newValue,
      metadata: { field: 'defaultRetentionDays' },
    });
  }

  /**
   * Set retention override for a specific recording
   *
   * AC2: Task-level retention override (applied to recording)
   *
   * @param recordingId - Recording ID
   * @param retentionDays - Override retention period in days
   * @param userId - User making the change (for audit)
   */
  async setRecordingRetentionOverride(
    recordingId: string,
    retentionDays: number,
    userId: string,
  ): Promise<void> {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Recalculate scheduled deletion with override
    const scheduledDeletionAt = this.calculateScheduledDeletion({
      createdAt: recording.createdAt,
      recordingRetentionOverrideDays: retentionDays,
    });

    const oldValue = {
      retentionOverrideDays: recording.retentionOverrideDays,
      scheduledDeletionAt: recording.scheduledDeletionAt,
    };

    // Update recording
    await this.prisma.recording.update({
      where: { id: recordingId },
      data: {
        retentionOverrideDays: retentionDays,
        scheduledDeletionAt,
      },
    });

    const newValue = {
      retentionOverrideDays: retentionDays,
      scheduledDeletionAt,
    };

    // Audit trail
    await this.auditService.log({
      tenantId: recording.tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'RECORDING',
      resourceId: recordingId,
      oldValue,
      newValue,
      metadata: { action: 'retention_override' },
    });
  }

  /**
   * Apply legal hold to a recording
   *
   * AC3: Legal hold capability (exempt from deletion)
   *
   * @param recordingId - Recording ID
   * @param options - Legal hold options (reason, appliedBy)
   */
  async applyLegalHold(
    recordingId: string,
    options: LegalHoldOptions,
  ): Promise<void> {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    if (recording.legalHold) {
      throw new ForbiddenException('Recording already has legal hold applied');
    }

    const oldValue = {
      legalHold: recording.legalHold,
      legalHoldReason: recording.legalHoldReason,
    };

    // Apply legal hold
    await this.prisma.recording.update({
      where: { id: recordingId },
      data: {
        legalHold: true,
        legalHoldReason: options.reason,
        legalHoldBy: options.appliedBy,
        legalHoldAt: new Date(),
      },
    });

    const newValue = {
      legalHold: true,
      legalHoldReason: options.reason,
    };

    // Audit trail
    await this.auditService.log({
      tenantId: recording.tenantId,
      userId: options.appliedBy,
      action: 'UPDATE',
      resourceType: 'RECORDING',
      resourceId: recordingId,
      oldValue,
      newValue,
      metadata: { action: 'legal_hold_applied' },
    });
  }

  /**
   * Remove legal hold from a recording
   *
   * AC3: Legal hold management
   *
   * @param recordingId - Recording ID
   * @param userId - User removing the hold (for audit)
   */
  async removeLegalHold(
    recordingId: string,
    userId: string,
  ): Promise<void> {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    if (!recording.legalHold) {
      throw new ForbiddenException('Recording does not have legal hold applied');
    }

    const oldValue = {
      legalHold: recording.legalHold,
      legalHoldReason: recording.legalHoldReason,
    };

    // Remove legal hold
    await this.prisma.recording.update({
      where: { id: recordingId },
      data: {
        legalHold: false,
        legalHoldReason: null,
        legalHoldBy: null,
        legalHoldAt: null,
      },
    });

    const newValue = {
      legalHold: false,
      legalHoldReason: null,
    };

    // Audit trail
    await this.auditService.log({
      tenantId: recording.tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'RECORDING',
      resourceId: recordingId,
      oldValue,
      newValue,
      metadata: { action: 'legal_hold_removed' },
    });
  }

  /**
   * Find recordings eligible for deletion
   *
   * AC4: Automated deletion enforcement
   *
   * @param limit - Maximum number of recordings to return (default 100)
   * @returns Array of recording IDs eligible for deletion
   */
  async findRecordingsEligibleForDeletion(limit: number = 100): Promise<string[]> {
    const recordings = await this.prisma.recording.findMany({
      where: {
        scheduledDeletionAt: {
          lte: new Date(),
        },
        legalHold: false,
      },
      select: {
        id: true,
      },
      take: limit,
    });

    return recordings.map((r) => r.id);
  }

  /**
   * Delete an expired recording (with S3 cleanup)
   *
   * AC5: Manual deletion with confirmation
   *
   * @param recordingId - Recording ID
   * @param userId - User performing deletion (for audit)
   * @param force - Force delete even if not expired (requires SUPER_ADMIN)
   */
  async deleteRecording(
    recordingId: string,
    userId: string,
    force: boolean = false,
  ): Promise<void> {
    const recording = await this.prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Check legal hold
    if (recording.legalHold) {
      throw new ForbiddenException('Cannot delete recording with legal hold');
    }

    // Check if eligible for deletion (unless force)
    if (!force) {
      const now = new Date();
      if (!recording.scheduledDeletionAt || recording.scheduledDeletionAt > now) {
        throw new ForbiddenException(
          'Recording is not yet eligible for deletion based on retention policy',
        );
      }
    }

    // TODO: Delete from S3 (Story 1.4 integration)
    // await this.storageService.deleteFile(recording.s3Key);

    // Delete from database
    await this.prisma.recording.delete({
      where: { id: recordingId },
    });

    // Audit trail
    await this.auditService.log({
      tenantId: recording.tenantId,
      userId,
      action: 'DELETE',
      resourceType: 'RECORDING',
      resourceId: recordingId,
      oldValue: {
        id: recording.id,
        s3Key: recording.s3Key,
        scheduledDeletionAt: recording.scheduledDeletionAt,
        legalHold: recording.legalHold,
      },
      metadata: { force },
    });
  }

  /**
   * Recalculate scheduled deletion for all recordings (admin utility)
   *
   * Useful when organization retention policy changes
   *
   * @param tenantId - Organization tenant ID
   */
  async recalculateScheduledDeletions(tenantId: string): Promise<number> {
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const recordings = await this.prisma.recording.findMany({
      where: {
        tenantId,
        legalHold: false, // Don't update legal hold recordings
      },
    });

    let updateCount = 0;

    for (const recording of recordings) {
      const scheduledDeletionAt = this.calculateScheduledDeletion({
        organizationRetentionDays: organization.defaultRetentionDays,
        recordingRetentionOverrideDays: recording.retentionOverrideDays || undefined,
        createdAt: recording.createdAt,
      });

      await this.prisma.recording.update({
        where: { id: recording.id },
        data: { scheduledDeletionAt },
      });

      updateCount++;
    }

    return updateCount;
  }

  /**
   * Get retention policy info for an organization
   *
   * @param tenantId - Organization tenant ID
   * @returns Retention policy details and statistics
   */
  async getRetentionPolicyInfo(tenantId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const totalRecordings = await this.prisma.recording.count({
      where: { tenantId },
    });

    const recordingsWithLegalHold = await this.prisma.recording.count({
      where: { tenantId, legalHold: true },
    });

    const recordingsEligibleForDeletion = await this.prisma.recording.count({
      where: {
        tenantId,
        scheduledDeletionAt: { lte: new Date() },
        legalHold: false,
      },
    });

    return {
      defaultRetentionDays: organization.defaultRetentionDays,
      statistics: {
        totalRecordings,
        recordingsWithLegalHold,
        recordingsEligibleForDeletion,
      },
    };
  }
}
