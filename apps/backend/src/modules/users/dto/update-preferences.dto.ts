import { IsObject, IsOptional } from 'class-validator';

/**
 * Story 2.3: 10-Second Preview Video Tutorial
 * DTO for updating user preferences (stored in JSONB column)
 */
export class UpdatePreferencesDto {
  /**
   * User preferences object stored as JSONB
   * Can contain any valid JSON structure
   *
   * Example:
   * {
   *   hasSeenPreviewVideo: true,
   *   hasCompletedPracticeMode: true,
   *   preferredVideoQuality: '1080p',
   *   webcamPosition: 'top-right'
   * }
   */
  @IsObject()
  @IsOptional()
  preferences: Record<string, any>;
}
