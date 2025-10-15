import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Set tenant context for Row-Level Security (RLS)
   * This must be called before any queries that require tenant isolation
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}';`);
  }

  /**
   * Execute a query within a tenant context
   * Automatically sets and clears the tenant context
   */
  async withTenantContext<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
    return this.$transaction(async (tx: Prisma.TransactionClient) => {
      await (tx as PrismaService).setTenantContext(tenantId);
      return await callback();
    });
  }
}
