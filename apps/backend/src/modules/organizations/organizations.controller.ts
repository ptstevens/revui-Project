import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Register a new organization
   * POST /api/v1/organizations/register
   */
  @Post('register')
  async register(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.register(dto);
  }

  /**
   * Verify email with magic link token
   * GET /api/v1/organizations/verify-email?token=xxx
   */
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    // Hash the token to match database storage
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    return this.organizationsService.verifyEmail(tokenHash);
  }

  /**
   * Get organization by tenant ID
   * GET /api/v1/organizations/:tenantId
   */
  @Get(':tenantId')
  async findByTenantId(@Param('tenantId') tenantId: string) {
    return this.organizationsService.findByTenantId(tenantId);
  }
}
