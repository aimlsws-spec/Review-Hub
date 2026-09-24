import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { aiConfig } from './envs/ai.config';
import { appConfig } from './envs/app.config';
import { databaseConfig } from './envs/database.config';
import { firebaseConfig } from './envs/firebase.config';
import { jwtConfig } from './envs/jwt.config';
import { oauthConfig } from './envs/oauth.config';
import { paymentConfig } from './envs/payment.config';
import { platformConfig } from './envs/platform.config';
import { redisConfig } from './envs/redis.config';
import { riskConfig } from './envs/risk.config';
import { smtpConfig } from './envs/smtp.config';
import { storageConfig } from './envs/storage.config';
import { throttleConfig } from './envs/throttle.config';
import { twilioConfig } from './envs/twilio.config';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'staging').required(),
  APP_PORT: Joi.number().default(3000),
  IP_REPUTATION_REFRESH_HOURS: Joi.number().integer().min(1).default(24),
  // The mock gateway approves every signature, so it must never be selectable in production.
  PAYMENT_PROVIDER: Joi.alternatives().conditional('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('razorpay').allow(''),
    otherwise: Joi.string().valid('mock', 'razorpay').allow(''),
  }),
  // enableCors() in main.ts always sets credentials: true. Paired with the app.corsOrigins
  // fallback of '*' (see app.config.ts), an operator who forgets to set this in production would
  // silently get a CORS setup that lets any website make authenticated requests against this API —
  // browsers block a literal "*" alongside credentials, but the underlying cors package reflects
  // the caller's Origin back verbatim in that case, which has the same effect. Fail loud instead.
  CORS_ORIGINS: Joi.alternatives().conditional('NODE_ENV', {
    is: 'production',
    then: Joi.string().required().invalid('', '*').messages({
      'any.invalid': 'CORS_ORIGINS must be a real comma-separated origin list in production, never "*" — credentials are always enabled',
      'any.required': 'CORS_ORIGINS is required in production — credentials are always enabled, so the origin list must be explicit',
    }),
    otherwise: Joi.string().allow('', '*'),
  }),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug', 'verbose').default('info'),
  LOG_FILE_ENABLED: Joi.string().valid('true', 'false').default('true'),
  LOG_FILE_MAX_SIZE: Joi.string().default('20m'),
  LOG_FILE_MAX_FILES: Joi.string().default('14d'),
}).unknown(true);

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        appConfig,
        databaseConfig,
        firebaseConfig,
        jwtConfig,
        redisConfig,
        smtpConfig,
        storageConfig,
        throttleConfig,
        aiConfig,
        paymentConfig,
        platformConfig,
        oauthConfig,
        twilioConfig,
        riskConfig,
      ],
      validationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
