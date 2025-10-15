import { Controller, Post, Get, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

/**
 * Story 1.2: Updated to capture IP address and user agent for audit logging
 */

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
   *
   * Story 1.2: Updated to pass plain token and capture audit data
   */
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Req() req: Request) {
    // Extract IP address (handle proxy headers)
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress;

    // Extract user agent
    const userAgent = req.headers['user-agent'];

    // Pass plain token to service (hashing is handled internally)
    return this.organizationsService.verifyEmail(token, ipAddress, userAgent);
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
