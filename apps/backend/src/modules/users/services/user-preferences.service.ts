import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/common/types/user-preferences.type';

/**
 * Service for managing user preferences
 * Story 2.3: 10-Second Preview Video Tutorial
 */
@Injectable()
export class UserPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user preferences with defaults
   */
  async getUserPreferences(userId: string, tenantId: string): Promise<UserPreferences> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: tenantId,
      },
      select: {
        preferences: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Merge with defaults to ensure all keys are present
    return {
      ...DEFAULT_USER_PREFERENCES,
      ...(user.preferences as UserPreferences || {}),
    };
  }

  /**
   * Update specific preference keys
   */
  async updateUserPreferences(
    userId: string,
    tenantId: string,
    updates: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const currentPreferences = await this.getUserPreferences(userId, tenantId);

    const mergedPreferences = {
      ...currentPreferences,
      ...updates,
    };

    await this.prisma.user.update({
      where: {
        tenantId_email: {
          tenantId: tenantId,
          email: (await this.prisma.user.findFirst({
            where: { id: userId, tenantId },
            select: { email: true },
          }))?.email || '',
        },
      },
      data: {
        preferences: mergedPreferences,
      },
    });

    return mergedPreferences;
  }

  /**
   * Mark tutorial as skipped (Story 2.3)
   */
  async skipTutorial(userId: string, tenantId: string): Promise<void> {
    await this.updateUserPreferences(userId, tenantId, {
      tutorialSkipped: true,
      tutorialCompletedAt: new Date().toISOString(),
    });
  }

  /**
   * Check if user should see the tutorial (Story 2.3)
   */
  async shouldShowTutorial(userId: string, tenantId: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId, tenantId);

    // Show tutorial if:
    // 1. User hasn't skipped it
    // 2. Feature flag is enabled
    return !preferences.tutorialSkipped &&
           (preferences.features?.showPreviewTutorial !== false);
  }

  /**
   * Reset user preferences to defaults
   */
  async resetPreferences(userId: string, tenantId: string): Promise<UserPreferences> {
    await this.prisma.user.update({
      where: {
        tenantId_email: {
          tenantId: tenantId,
          email: (await this.prisma.user.findFirst({
            where: { id: userId, tenantId },
            select: { email: true },
          }))?.email || '',
        },
      },
      data: {
        preferences: DEFAULT_USER_PREFERENCES,
      },
    });

    return DEFAULT_USER_PREFERENCES;
  }
}