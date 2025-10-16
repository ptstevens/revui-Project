import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { BulkInviteUsersDto } from './dto/invite-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@prisma/client';

/**
 * Story 1.3: User Invitation & Role Assignment Controller
 *
 * Provides endpoints for:
 * - Bulk user invitations (AC1)
 * - Accepting invitations (AC2)
 * - User list management (AC3)
 * - Role management (AC4)
 * - User deactivation (AC5)
 */
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Bulk invite users
   * Story 1.3 AC1
   *
   * @requires ADMIN or SUPER_ADMIN role
   */
  @Post('invite')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async bulkInvite(
    @Body() dto: BulkInviteUsersDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.bulkInvite(tenantId, userId, dto);
  }

  /**
   * Accept an invitation
   * Story 1.3 AC2
   *
   * Public endpoint (no auth required)
   */
  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Body('token') token: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.usersService.acceptInvitation(token, ipAddress, userAgent);
  }

  /**
   * Get all users in the organization
   * Story 1.3 AC3
   *
   * @requires Any authenticated user
   */
  @Get()
  @UseGuards(RolesGuard)
  async findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('includeDeactivated') includeDeactivated?: string,
  ) {
    const include = includeDeactivated === 'true';
    return this.usersService.findAll(tenantId, include);
  }

  /**
   * Get a single user by ID
   *
   * @requires Any authenticated user in the same organization
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.usersService.findOne(tenantId, id);
  }

  /**
   * Update a user's information or role
   * Story 1.3 AC4
   *
   * @requires ADMIN or SUPER_ADMIN role
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.update(tenantId, id, adminId, dto);
  }

  /**
   * Deactivate a user
   * Story 1.3 AC5
   *
   * @requires ADMIN or SUPER_ADMIN role
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.deactivate(tenantId, id, adminId);
  }

  /**
   * Reactivate a deactivated user
   *
   * @requires ADMIN or SUPER_ADMIN role
   */
  @Post(':id/reactivate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async reactivate(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.usersService.reactivate(tenantId, id, adminId);
  }

  /**
   * Update current user's preferences
   * Story 2.3: 10-Second Preview Video Tutorial
   *
   * @requires Any authenticated user (can only update their own preferences)
   */
  @Patch('me/preferences')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.updatePreferences(userId, dto.preferences);
  }
}
