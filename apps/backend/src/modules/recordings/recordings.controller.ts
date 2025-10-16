import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RecordingsService } from './recordings.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';

/**
 * Story 1.4: Recording Storage Infrastructure Controller
 *
 * Provides endpoints for:
 * - Initiating uploads with pre-signed URLs (AC1)
 * - Completing uploads (AC2)
 * - Viewing recordings (AC4)
 * - Managing recordings
 */
@Controller('recordings')
@UseGuards(RolesGuard)
export class RecordingsController {
  constructor(private readonly recordingsService: RecordingsService) {}

  /**
   * Health check endpoint for R2 configuration
   * Public endpoint - no authentication required
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return this.recordingsService.healthCheck();
  }

  /**
   * Initiate a recording upload
   * Story 1.4 AC1
   *
   * @requires Any authenticated user
   * @returns Pre-signed upload URL and recording metadata
   */
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  async initiateUpload(
    @Body() dto: InitiateUploadDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.recordingsService.initiateUpload(tenantId, userId, dto);
  }

  /**
   * Complete a recording upload
   * Story 1.4 AC2
   *
   * @requires Any authenticated user (must own the recording)
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeUpload(
    @Param('id') recordingId: string,
    @Body() dto: CompleteUploadDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.recordingsService.completeUpload(tenantId, userId, recordingId, dto);
  }

  /**
   * Get all recordings for a task
   *
   * @requires Any authenticated user in the same organization
   */
  @Get('task/:taskId')
  async findByTask(
    @Param('taskId') taskId: string,
    @Query('userId') userId: string | undefined,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.recordingsService.findByTask(tenantId, taskId, userId);
  }

  /**
   * Get a single recording with download URL
   * Story 1.4 AC4
   *
   * @requires Any authenticated user (with appropriate permissions)
   */
  @Get(':id')
  async findOne(
    @Param('id') recordingId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.recordingsService.findOne(tenantId, recordingId, userId, userRole);
  }

  /**
   * Delete a recording
   *
   * @requires ADMIN or SUPER_ADMIN role
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id') recordingId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.recordingsService.delete(tenantId, recordingId, userId, userRole);
  }

  /**
   * Get count of completed recordings for current user
   * Story 2.3: 10-Second Preview Video Tutorial
   *
   * Used to determine if user is a first-time recorder
   *
   * @requires Any authenticated user
   * @returns Object with count property
   */
  @Get('count')
  @HttpCode(HttpStatus.OK)
  async getRecordingCount(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const count = await this.recordingsService.countByUser(tenantId, userId);
    return { count };
  }
}
