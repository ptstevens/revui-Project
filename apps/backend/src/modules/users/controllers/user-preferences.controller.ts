import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserPreferencesService } from '../services/user-preferences.service';
import { UserPreferences } from '@/common/types/user-preferences.type';

/**
 * Controller for managing user preferences
 * Story 2.3: 10-Second Preview Video Tutorial
 */
@Controller('api/user/preferences')
@UseGuards(RolesGuard)
export class UserPreferencesController {
  constructor(
    private readonly userPreferencesService: UserPreferencesService,
  ) {}

  /**
   * Get current user's preferences
   */
  @Get()
  async getPreferences(@Req() req: any): Promise<UserPreferences> {
    const { userId, tenantId } = req.user;
    return this.userPreferencesService.getUserPreferences(userId, tenantId);
  }

  /**
   * Update user preferences
   */
  @Put()
  async updatePreferences(
    @Req() req: any,
    @Body() updates: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const { userId, tenantId } = req.user;
    return this.userPreferencesService.updateUserPreferences(
      userId,
      tenantId,
      updates,
    );
  }

  /**
   * Skip tutorial endpoint (Story 2.3)
   */
  @Post('skip-tutorial')
  async skipTutorial(@Req() req: any): Promise<{ success: boolean }> {
    const { userId, tenantId } = req.user;
    await this.userPreferencesService.skipTutorial(userId, tenantId);
    return { success: true };
  }

  /**
   * Check if tutorial should be shown (Story 2.3)
   */
  @Get('should-show-tutorial')
  async shouldShowTutorial(@Req() req: any): Promise<{ showTutorial: boolean }> {
    const { userId, tenantId } = req.user;
    const showTutorial = await this.userPreferencesService.shouldShowTutorial(
      userId,
      tenantId,
    );
    return { showTutorial };
  }

  /**
   * Reset preferences to defaults
   */
  @Post('reset')
  async resetPreferences(@Req() req: any): Promise<UserPreferences> {
    const { userId, tenantId } = req.user;
    return this.userPreferencesService.resetPreferences(userId, tenantId);
  }
}