import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../services/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Check if route is marked as public
    // Note: In middleware, we can't access route metadata easily
    // So we rely on the exclusion list in app.module.ts

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
