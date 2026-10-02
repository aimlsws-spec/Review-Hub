import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEVELOPMENT_ENCRYPTION_KEY, DEVELOPMENT_HASH_KEY, FieldCipher } from './field-cipher';

/** The app-wide FieldCipher, built from configuration (see field-encryption.config.ts). */
@Injectable()
export class FieldEncryptionService extends FieldCipher {
  constructor(config: ConfigService) {
    const key = config.get<string>('fieldEncryption.key') || '';
    const hashKey = config.get<string>('fieldEncryption.hashKey') || '';
    const usingDevelopmentKeys = !key || !hashKey;
    super({
      key: key || DEVELOPMENT_ENCRYPTION_KEY,
      previousKeys: config.get<string[]>('fieldEncryption.previousKeys') ?? [],
      hashKey: hashKey || DEVELOPMENT_HASH_KEY,
    });
    if (usingDevelopmentKeys) {
      // Production can not get here: the config schema requires both keys when NODE_ENV=production.
      new Logger(FieldEncryptionService.name).warn(
        'FIELD_ENCRYPTION_KEY / FIELD_HASH_KEY are not set: using the built-in DEVELOPMENT keys. Fine for local work only.',
      );
    }
  }
}
