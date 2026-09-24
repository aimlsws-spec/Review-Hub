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
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AppConfigModule } from './modules/app-config/app-config.module';
import { MaintenanceGuard } from './modules/app-config/guards';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { CampaignModule } from './modules/campaign/campaign.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { LocationModule } from './modules/location/location.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReferralModule } from './modules/referral/referral.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ScheduledJobsModule } from './modules/scheduled-jobs/scheduled-jobs.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { SupportModule } from './modules/support/support.module';
import { TaskModule } from './modules/task/task.module';
import { UserKycModule } from './modules/user-kyc/user-kyc.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WebhookModule } from './modules/webhooks/webhook.module';
import { QueueModule } from './queues/queue.module';
import { AuditModule } from './shared/audit/audit.module';
import { HealthModule } from './shared/health/health.module';
import { LoggerModule } from './shared/logger/logger.module';
import { SmsModule } from './sms/sms.module';
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
    //
    // SECURITY (fixed 23 Sep 2026, security review): `user` and `merchant` were mounted
    // here too, contradicting this comment and the identical one in kyc.service.ts /
    // user-kyc.service.ts. Every saveFile() call into either folder is a sensitive
    // document — user PAN/KYC uploads (user/{userId}/documents), merchant KYC documents
    // and GST invoices/credit-debit notes (merchant/{merchantId}/documents|invoices) —
    // so both trees were reachable with a UUID filename and zero authentication, the
    // exact thing this comment says never happens. Both already have a proper
    // authenticated download path with an ownership check (see getDocumentFilePath in
    // user-kyc.service.ts / kyc.service.ts, used by their controllers' res.sendFile()) —
    // removing the static mount only closes the accidental duplicate, unauthenticated one.
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uploadsRoot = path.resolve(config.get<string>('storage.localPath', './uploads'));
        return [
          { rootPath: path.join(uploadsRoot, 'profile'), serveRoot: '/uploads/profile' },
          { rootPath: path.join(uploadsRoot, 'campaign'), serveRoot: '/uploads/campaign' },
          { rootPath: path.join(uploadsRoot, 'cms'), serveRoot: '/uploads/cms' },
          // AI-composed story images (ai-assist.service.ts composeStory) — marketing content meant
          // to be shared/reposted, same public category as profile/campaign/cms above. Added
          // 23 Sep 2026: without this the backend endpoint returned an imageUrl no client could
          // ever load, since it was the one thing saveFile() wrote outside every mounted folder.
          { rootPath: path.join(uploadsRoot, 'stories'), serveRoot: '/uploads/stories' },
        ];
      },
    }),
    MailModule,
    SmsModule,
    AuditModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    LocationModule,
    PaymentModule,
    MerchantModule,
    CampaignModule,
    TaskModule,
    AiModule,
    WalletModule,
    LeaderboardModule,
    AppConfigModule,
    ReferralModule,
    NotificationModule,
    SupportModule,
    UserKycModule,
    SettlementModule,
    GamificationModule,
    MarketplaceModule,
    DashboardModule,
    JobsModule,
    AdminModule,
    HealthModule,
    WebhookModule,
    ScheduledJobsModule,
    AnalyticsModule,
    ReportsModule,
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
    // After the sign-in guard: whether the caller is an administrator is only known once the token has been read.
    { provide: APP_GUARD, useClass: MaintenanceGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, RequestLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
