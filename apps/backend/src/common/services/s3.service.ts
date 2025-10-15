import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Story 1.4: Cloudflare R2 Service for Recording Storage
 *
 * Provides secure storage infrastructure with:
 * - Pre-signed URL generation for direct uploads (AC1, AC2)
 * - Multi-tenant path isolation (AC3)
 * - Secure download access (AC4)
 * - Zero egress costs for downloads
 * - File lifecycle management
 *
 * Uses Cloudflare R2 (S3-compatible) for cost-effective storage
 */
@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    // Initialize R2 client (S3-compatible)
    const accountId = this.configService.get('R2_ACCOUNT_ID') || '';

    this.s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' for region
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get('R2_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get('R2_SECRET_ACCESS_KEY') || '',
      },
    });

    this.bucketName = this.configService.get('R2_BUCKET_NAME') || 'revui-recordings';
  }

  /**
   * Generate a pre-signed URL for uploading a recording
   * Story 1.4 AC1 & AC2
   *
   * @param tenantId - Organization's tenant ID
   * @param taskId - Task ID
   * @param userId - User ID
   * @param filename - Original filename
   * @param contentType - MIME type (e.g., 'video/webm')
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Pre-signed upload URL and S3 key
   */
  async generatePresignedUploadUrl(
    tenantId: string,
    taskId: string,
    userId: string,
    filename: string,
    contentType: string = 'video/webm',
    expiresIn: number = 3600 // 1 hour
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    try {
      // Story 1.4 AC3: Multi-tenant path structure
      // Format: {tenantId}/{taskId}/{userId}/{timestamp}_{filename}
      const timestamp = Date.now();
      const sanitizedFilename = this.sanitizeFilename(filename);
      const s3Key = `${tenantId}/${taskId}/${userId}/${timestamp}_${sanitizedFilename}`;

      // Create PutObject command
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: contentType,
        // Security headers
        ServerSideEncryption: 'AES256',
        // Optional: Add metadata
        Metadata: {
          tenantId,
          taskId,
          userId,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Generate pre-signed URL
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return { uploadUrl, s3Key };
    } catch (error) {
      console.error('Error generating pre-signed upload URL:', error);
      throw new InternalServerErrorException('Failed to generate upload URL');
    }
  }

  /**
   * Generate a pre-signed URL for downloading a recording
   * Story 1.4 AC4
   *
   * @param s3Key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Pre-signed download URL
   */
  async generatePresignedDownloadUrl(
    s3Key: string,
    expiresIn: number = 3600 // 1 hour
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return downloadUrl;
    } catch (error) {
      console.error('Error generating pre-signed download URL:', error);
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  /**
   * Delete a recording from R2
   * Used when recordings are deleted or expired
   *
   * @param s3Key - R2 object key (kept as s3Key for S3 compatibility)
   */
  async deleteRecording(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting recording:', error);
      throw new InternalServerErrorException('Failed to delete recording');
    }
  }

  /**
   * Validate R2 configuration
   * Used for health checks and startup validation
   */
  async validateConfiguration(): Promise<{ configured: boolean; message: string }> {
    const accountId = this.configService.get('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('R2_SECRET_ACCESS_KEY');
    const bucketName = this.configService.get('R2_BUCKET_NAME');

    const missingVars: string[] = [];
    if (!accountId) missingVars.push('R2_ACCOUNT_ID');
    if (!accessKeyId) missingVars.push('R2_ACCESS_KEY_ID');
    if (!secretAccessKey) missingVars.push('R2_SECRET_ACCESS_KEY');
    if (!bucketName) missingVars.push('R2_BUCKET_NAME');

    if (missingVars.length > 0) {
      return {
        configured: false,
        message: `Missing required environment variables: ${missingVars.join(', ')}`,
      };
    }

    return {
      configured: true,
      message: 'R2 service configured successfully',
    };
  }

  /**
   * Helper: Sanitize filename for R2/S3 storage
   * Removes special characters and spaces
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .toLowerCase();
  }

  /**
   * Helper: Extract tenant ID from R2 object key
   * Useful for validation and auditing
   */
  extractTenantIdFromKey(s3Key: string): string | null {
    const parts = s3Key.split('/');
    return parts.length > 0 ? parts[0] : null;
  }

  /**
   * Helper: Extract task ID from R2 object key
   */
  extractTaskIdFromKey(s3Key: string): string | null {
    const parts = s3Key.split('/');
    return parts.length > 1 ? parts[1] : null;
  }

  /**
   * Helper: Extract user ID from R2 object key
   */
  extractUserIdFromKey(s3Key: string): string | null {
    const parts = s3Key.split('/');
    return parts.length > 2 ? parts[2] : null;
  }
}
