import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { S3Service } from '@/common/services/s3.service';
import { RetentionPolicyService } from '@/common/services/retention-policy.service';
import { AuditService } from '@/common/services/audit.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { UploadStatus, UserRole } from '@prisma/client';

/**
 * Story 1.4: Recording Storage Infrastructure Service
 * Story 1.5: Enhanced with retention policy integration
 * Story 1.8: Enhanced with audit trail integration
 */
@Injectable()
export class RecordingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly retentionPolicyService: RetentionPolicyService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Initiate a recording upload
   * Story 1.4 AC1: Generate pre-signed upload URL
   *
   * @param tenantId - Organization's tenant ID
   * @param userId - User initiating the upload
   * @param dto - Upload initiation data
   * @returns Pre-signed upload URL and recording metadata
   */
  async initiateUpload(
    tenantId: string,
    userId: string,
    dto: InitiateUploadDto
  ) {
    // TODO: Validate taskId exists and user has access (implement in future story)
    // For now, we'll just validate the user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
        deactivatedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate pre-signed upload URL
    const { uploadUrl, s3Key } = await this.s3Service.generatePresignedUploadUrl(
      tenantId,
      dto.taskId,
      userId,
      dto.filename,
      dto.contentType || 'video/webm',
      dto.urlExpiresIn || 3600 // Default 1 hour
    );

    // Create recording record in database with PENDING status
    const recording = await this.prisma.recording.create({
      data: {
        tenantId,
        taskId: dto.taskId,
        userId,
        s3Key,
        fileSize: BigInt(0), // Will be updated on completion
        mimeType: dto.contentType || 'video/webm',
        uploadStatus: UploadStatus.PENDING,
        // Story 2.2: Screen source metadata
        screenType: dto.screenType,
        sourceName: dto.sourceName,
      },
      select: {
        id: true,
        s3Key: true,
        uploadStatus: true,
        createdAt: true,
      },
    });

    // Story 1.8: Log audit event
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CREATE',
      resourceType: 'RECORDING',
      resourceId: recording.id,
      newValue: {
        recordingId: recording.id,
        taskId: dto.taskId,
        filename: dto.filename,
        uploadStatus: 'PENDING',
      },
      metadata: {
        action: 'upload_initiated',
      },
    });

    return {
      recordingId: recording.id,
      uploadUrl,
      s3Key: recording.s3Key,
      expiresIn: dto.urlExpiresIn || 3600,
      uploadStatus: recording.uploadStatus,
    };
  }

  /**
   * Complete a recording upload
   * Story 1.4 AC2: Mark upload as complete
   *
   * @param tenantId - Organization's tenant ID
   * @param userId - User completing the upload
   * @param recordingId - Recording ID
   * @param dto - Upload completion data
   */
  async completeUpload(
    tenantId: string,
    userId: string,
    recordingId: string,
    dto: CompleteUploadDto
  ) {
    // Find recording
    const recording = await this.prisma.recording.findFirst({
      where: {
        id: recordingId,
        tenantId,
        userId,
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Verify s3Key matches
    if (recording.s3Key !== dto.s3Key) {
      throw new BadRequestException('S3 key mismatch');
    }

    // Verify recording is in PENDING status
    if (recording.uploadStatus !== UploadStatus.PENDING) {
      throw new BadRequestException(`Recording is already ${recording.uploadStatus}`);
    }

    // Story 1.5: Get organization retention policy
    const organization = await this.prisma.organization.findUnique({
      where: { tenantId },
      select: { defaultRetentionDays: true },
    });

    // Calculate scheduled deletion date based on organization policy
    const completedAt = new Date();
    const scheduledDeletionAt = this.retentionPolicyService.calculateScheduledDeletion({
      organizationRetentionDays: organization?.defaultRetentionDays || 180,
      recordingRetentionOverrideDays: undefined, // No override on creation
      createdAt: completedAt,
    });

    // Update recording with file metadata and retention policy
    const updatedRecording = await this.prisma.recording.update({
      where: { id: recordingId },
      data: {
        fileSize: BigInt(dto.fileSize),
        duration: dto.duration,
        uploadStatus: UploadStatus.COMPLETE,
        completedAt,
        scheduledDeletionAt, // Story 1.5: Set scheduled deletion
      },
      select: {
        id: true,
        s3Key: true,
        fileSize: true,
        duration: true,
        uploadStatus: true,
        completedAt: true,
        scheduledDeletionAt: true,
      },
    });

    // Story 1.8: Log audit event
    await this.auditService.log({
      tenantId,
      userId,
      action: 'UPDATE',
      resourceType: 'RECORDING',
      resourceId: recording.id,
      oldValue: {
        uploadStatus: 'PENDING',
        completedAt: null,
        scheduledDeletionAt: null,
      },
      newValue: {
        uploadStatus: 'COMPLETE',
        completedAt,
        scheduledDeletionAt,
        fileSize: dto.fileSize,
        duration: dto.duration,
      },
      metadata: {
        action: 'upload_completed',
      },
    });

    return {
      ...updatedRecording,
      fileSize: updatedRecording.fileSize.toString(), // Convert BigInt to string for JSON
    };
  }

  /**
   * Get all recordings for a task
   *
   * @param tenantId - Organization's tenant ID
   * @param taskId - Task ID
   * @param userId - User ID (optional, for filtering)
   */
  async findByTask(tenantId: string, taskId: string, userId?: string) {
    const where: any = {
      tenantId,
      taskId,
      uploadStatus: UploadStatus.COMPLETE, // Only return completed uploads
    };

    if (userId) {
      where.userId = userId;
    }

    const recordings = await this.prisma.recording.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        userId: true,
        s3Key: true,
        fileSize: true,
        duration: true,
        mimeType: true,
        uploadStatus: true,
        screenType: true,      // Story 2.2
        sourceName: true,      // Story 2.2
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return recordings.map(r => ({
      ...r,
      fileSize: r.fileSize.toString(), // Convert BigInt to string
    }));
  }

  /**
   * Get a single recording with download URL
   * Story 1.4 AC4: Secure download access
   *
   * @param tenantId - Organization's tenant ID
   * @param recordingId - Recording ID
   * @param requestingUserId - User requesting access
   * @param requestingUserRole - User's role
   */
  async findOne(
    tenantId: string,
    recordingId: string,
    requestingUserId: string,
    requestingUserRole: UserRole
  ) {
    const recording = await this.prisma.recording.findFirst({
      where: {
        id: recordingId,
        tenantId,
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Access control: Users can only access their own recordings,
    // but ADMIN, REVIEWER, and SUPER_ADMIN can access all recordings
    if (
      recording.userId !== requestingUserId &&
      requestingUserRole !== UserRole.ADMIN &&
      requestingUserRole !== UserRole.REVIEWER &&
      requestingUserRole !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Access denied');
    }

    // Generate download URL if recording is complete
    let downloadUrl: string | undefined;
    if (recording.uploadStatus === UploadStatus.COMPLETE) {
      downloadUrl = await this.s3Service.generatePresignedDownloadUrl(
        recording.s3Key,
        3600 // 1 hour expiration
      );
    }

    // Story 1.8: Log audit event
    await this.auditService.log({
      tenantId,
      userId: requestingUserId,
      action: 'READ',
      resourceType: 'RECORDING',
      resourceId: recording.id,
      metadata: {
        action: 'recording_accessed',
        ownerId: recording.userId,
      },
    });

    return {
      id: recording.id,
      taskId: recording.taskId,
      userId: recording.userId,
      s3Key: recording.s3Key,
      fileSize: recording.fileSize.toString(),
      duration: recording.duration,
      mimeType: recording.mimeType,
      uploadStatus: recording.uploadStatus,
      screenType: recording.screenType,        // Story 2.2
      sourceName: recording.sourceName,        // Story 2.2
      createdAt: recording.createdAt,
      completedAt: recording.completedAt,
      downloadUrl,
    };
  }

  /**
   * Delete a recording
   * Only ADMIN and SUPER_ADMIN can delete recordings
   *
   * @param tenantId - Organization's tenant ID
   * @param recordingId - Recording ID
   * @param userId - User deleting the recording
   * @param userRole - User's role
   */
  async delete(
    tenantId: string,
    recordingId: string,
    userId: string,
    userRole: UserRole
  ) {
    // Only ADMIN and SUPER_ADMIN can delete recordings
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only admins can delete recordings');
    }

    const recording = await this.prisma.recording.findFirst({
      where: {
        id: recordingId,
        tenantId,
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Delete from S3
    await this.s3Service.deleteRecording(recording.s3Key);

    // Delete from database
    await this.prisma.recording.delete({
      where: { id: recordingId },
    });

    // Story 1.8: Log audit event
    await this.auditService.log({
      tenantId,
      userId,
      action: 'DELETE',
      resourceType: 'RECORDING',
      resourceId: recording.id,
      oldValue: {
        id: recording.id,
        s3Key: recording.s3Key,
        uploadStatus: recording.uploadStatus,
      },
      metadata: {
        action: 'recording_deleted',
      },
    });

    return {
      message: 'Recording deleted successfully',
    };
  }

  /**
   * Health check for R2 configuration
   * Public endpoint - verifies R2 service is properly configured
   */
  async healthCheck() {
    const r2Status = await this.s3Service.validateConfiguration();

    return {
      status: r2Status.configured ? 'healthy' : 'unhealthy',
      r2: r2Status,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Count completed recordings for a user
   * Story 2.3: 10-Second Preview Video Tutorial
   *
   * Used to determine if user is a first-time recorder
   *
   * @param tenantId - Organization's tenant ID
   * @param userId - User ID
   * @returns Count of completed recordings
   */
  async countByUser(tenantId: string, userId: string): Promise<number> {
    const count = await this.prisma.recording.count({
      where: {
        tenantId,
        userId,
        uploadStatus: UploadStatus.COMPLETE,
      },
    });

    return count;
  }

}
