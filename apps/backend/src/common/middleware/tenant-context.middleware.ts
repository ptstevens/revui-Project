import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from authenticated user (set by JWT strategy)
    const tenantId = (req.user as any)?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('No tenant context available');
    }

    // Set tenant context for this request's database queries
    try {
      await this.prisma.setTenantContext(tenantId);
      next();
    } catch (error) {
      throw new UnauthorizedException('Failed to set tenant context');
    }
  }
}
