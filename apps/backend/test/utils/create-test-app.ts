import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { API_PREFIX, API_VERSION } from '../../src/common/constants';
import { buildValidationPipe } from '../../src/common/pipes/validation.pipe';

/** Mirrors main.ts's bootstrap (prefix, versioning, validation) so e2e specs hit the same routes as production. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_VERSION });
  app.useGlobalPipes(buildValidationPipe());
  await app.init();

  return app;
}
