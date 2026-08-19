import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as compression from 'compression';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AppModule } from './app.module';
import { API_PREFIX, API_VERSION } from './common/constants';
import { buildValidationPipe } from './common/pipes/validation.pipe';
import { setupSwagger } from './config/swagger.config';

async function bootstrap(): Promise<void> {
  // rawBody: true preserves the unparsed request body alongside the parsed one,
  // required to verify the Razorpay webhook's HMAC signature.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  // Use Winston as the NestJS logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const config = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(compression());

  // Global prefix & URI versioning
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_VERSION });

  // CORS
  const corsOrigins = config.get<string>('app.corsOrigins', '*');
  app.enableCors({
    origin: corsOrigins === '*' ? '*' : corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(buildValidationPipe());

  const port = config.get<number>('app.port', 3000);
  const host = config.get<string>('app.host', '0.0.0.0');

  // Swagger (non-production only)
  if (config.get<string>('app.env') !== 'production') {
    setupSwagger(app);
    logger.log(`Swagger docs: http://localhost:${port}/${API_PREFIX}/docs`, 'Bootstrap');
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port, host);

  logger.log(`Application running on port ${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
