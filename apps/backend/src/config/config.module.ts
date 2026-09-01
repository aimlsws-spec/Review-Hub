import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

import { aiConfig } from './envs/ai.config';
import { appConfig } from './envs/app.config';
import { databaseConfig } from './envs/database.config';
import { jwtConfig } from './envs/jwt.config';
import { oauthConfig } from './envs/oauth.config';
import { paymentConfig } from './envs/payment.config';
import { platformConfig } from './envs/platform.config';
import { queueConfig } from './envs/queue.config';
import { redisConfig } from './envs/redis.config';
import { smtpConfig } from './envs/smtp.config';
import { storageConfig } from './envs/storage.config';
import { throttleConfig } from './envs/throttle.config';

const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'staging').required(),
  APP_PORT: Joi.number().default(3000),
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
        jwtConfig,
        redisConfig,
        smtpConfig,
        storageConfig,
        throttleConfig,
        queueConfig,
        aiConfig,
        paymentConfig,
        platformConfig,
        oauthConfig,
      ],
      validationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
