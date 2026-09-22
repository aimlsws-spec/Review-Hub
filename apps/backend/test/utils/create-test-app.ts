import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { API_PREFIX, API_VERSION } from '../../src/common/constants';
import { buildValidationPipe } from '../../src/common/pipes/validation.pipe';
import { assertSafeTestEnvironment } from '../setup/safety';

/** Mirrors main.ts's bootstrap (raw body, prefix, versioning, validation) so e2e specs hit the same routes as production. */
export async function createTestApp(): Promise<INestApplication> {
  // Belt and braces: the setup files already checked this, but a test must never start an app on real data.
  assertSafeTestEnvironment();

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // rawBody is on in main.ts too: payment webhooks are verified against the bytes exactly as they arrived.
  const app = moduleRef.createNestApplication({ rawBody: true });
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_VERSION });
  app.useGlobalPipes(buildValidationPipe());
  await app.init();

  return app;
}
