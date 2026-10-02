import { BankDetailsProtector } from './bank-details-protector';
import { FieldCipher } from './field-cipher';
import { FieldEncryptionService } from './field-encryption.service';

/** Fixed keys for tests only. */
export const TEST_FIELD_KEYS = {
  key: Buffer.alloc(32, 7).toString('base64'),
  hashKey: Buffer.alloc(32, 9).toString('base64'),
};

/** A real cipher with test keys, for specs that should see actual encryption rather than a mock. */
export function testFieldCipher(): FieldEncryptionService {
  return new FieldCipher(TEST_FIELD_KEYS) as FieldEncryptionService;
}

export function testBankDetailsProtector(): BankDetailsProtector {
  return new BankDetailsProtector(testFieldCipher());
}
