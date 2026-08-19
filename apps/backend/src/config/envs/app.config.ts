import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env.APP_NAME ?? 'viral-kar-backend',
  version: process.env.APP_VERSION ?? '1.0.0',
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  host: process.env.APP_HOST ?? '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS ?? '*',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
}));
