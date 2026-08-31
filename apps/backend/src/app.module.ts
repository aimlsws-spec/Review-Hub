import * as path from 'path';

import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';

import { CacheModule } from './cache/cache.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { RequestIdMiddleware, RequestLoggerMiddleware } from './common/middleware';
import { ConfigModule } from './config/config.module';
import { PrismaExceptionFilter } from './database/prisma/prisma-exception.filter';
import { PrismaModule } from './database/prisma/prisma.module';
import { JobsModule } from './jobs/jobs.module';
import { MailModule } from './mail/mail.module';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CampaignModule } from './modules/campaign/campaign.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReferralModule } from './modules/referral/referral.module';
import { SupportModule } from './modules/support/support.module';
import { TaskModule } from './modules/task/task.module';
import { UserKycModule } from './modules/user-kyc/user-kyc.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { QueueModule } from './queues/queue.module';
import { AuditModule } from './shared/audit/audit.module';
import { HealthModule } from './shared/health/health.module';
import { LoggerModule } from './shared/logger/logger.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    LoggerModule,
    CacheModule,
    QueueModule,
    StorageModule,
    // Only folders with genuinely public content are mounted here — merchant KYC
    // documents and task-submission proof are deliberately excluded since serve-static's
    // `exclude` option only skips the SPA fallback route, not the underlying static
    // middleware, so it cannot be used to gate access to sensitive uploads.
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uploadsRoot = path.resolve(config.get<string>('storage.localPath', './uploads'));
        return [
          { rootPath: path.join(uploadsRoot, 'profile'), serveRoot: '/uploads/profile' },
          { rootPath: path.join(uploadsRoot, 'campaign'), serveRoot: '/uploads/campaign' },
          { rootPath: path.join(uploadsRoot, 'cms'), serveRoot: '/uploads/cms' },
        ];
      },
    }),
    MailModule,
    AuditModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    PaymentModule,
    MerchantModule,
    CampaignModule,
    TaskModule,
    AiModule,
    WalletModule,
    ReferralModule,
    NotificationModule,
    SupportModule,
    UserKycModule,
    JobsModule,
    AdminModule,
    HealthModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttlMs', 60000),
            limit: config.get<number>('throttle.limit', 100),
          },
        ],
      }),
    }),
  ],
  providers: [
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
