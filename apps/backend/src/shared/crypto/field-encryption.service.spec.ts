import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEVELOPMENT_ENCRYPTION_KEY, FieldCipher } from './field-cipher';
import { FieldEncryptionService } from './field-encryption.service';

describe('FieldEncryptionService', () => {
  const key = (fill: number) => Buffer.alloc(32, fill).toString('base64');
  const config = (values: Record<string, unknown>) => ({ get: (name: string) => values[name] }) as unknown as ConfigService;

  afterEach(() => jest.restoreAllMocks());

  it('uses the configured keys', () => {
    const service = new FieldEncryptionService(config({ 'fieldEncryption.key': key(1), 'fieldEncryption.hashKey': key(2) }));
    const reference = new FieldCipher({ key: key(1), hashKey: key(2) });

    expect(reference.decrypt(service.encrypt('123456789012'))).toBe('123456789012');
  });

  it('falls back to the development keys, loudly, when none are configured', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const service = new FieldEncryptionService(config({}));
    const development = new FieldCipher({ key: DEVELOPMENT_ENCRYPTION_KEY, hashKey: key(2) });

    expect(development.decrypt(service.encrypt('123456789012'))).toBe('123456789012');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DEVELOPMENT keys'));
  });
});
