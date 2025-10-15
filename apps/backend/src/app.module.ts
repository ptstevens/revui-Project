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
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/verify-email', method: RequestMethod.GET },
        { path: 'organizations/register', method: RequestMethod.POST },
        { path: 'organizations/verify-email', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.GET },
        { path: 'recordings/health', method: RequestMethod.GET }
      )
      .forRoutes('*');
  }
}
