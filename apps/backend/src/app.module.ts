import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Common
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UsersModule } from './modules/users/users.module';
import { EmailModule } from './modules/email/email.module';
import { RecordingsModule } from './modules/recordings/recordings.module';
import { AuditModule } from './modules/audit/audit.module';
import { RetentionModule } from './modules/retention/retention.module';

// Services
import { PrismaService } from './common/services/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    OrganizationsModule,
    UsersModule,
    EmailModule,
    RecordingsModule,
    AuditModule,
    RetentionModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes except public ones
    consumer
      .apply(TenantContextMiddleware)
      .exclude(
        // Authentication endpoints (public)
        { path: 'auth/signup', method: RequestMethod.POST },
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/magic-login', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        // Legacy authentication endpoints (backward compatibility)
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/verify-email', method: RequestMethod.GET },
        // Organization endpoints (public)
        { path: 'organizations/register', method: RequestMethod.POST },
        { path: 'organizations/verify-email', method: RequestMethod.GET },
        // Health check endpoints
        { path: 'health', method: RequestMethod.GET },
        { path: 'recordings/health', method: RequestMethod.GET }
      )
      .forRoutes('*');
  }
}
