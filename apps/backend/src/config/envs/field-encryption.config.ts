import { registerAs } from '@nestjs/config';

/**
 * Keys for encrypting sensitive columns (bank account numbers, UPI IDs) and for the keyed hash that lets the app
 * find equal values without decrypting them. Each is 32 random bytes, base64-encoded:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * Required in production. Elsewhere a fixed development key is used, with a warning in the boot log, so a fresh
 * checkout runs without setup; never copy a development database into production.
 * FIELD_ENCRYPTION_PREVIOUS_KEYS (comma-separated) keeps old keys readable during a key change.
 */
export const fieldEncryptionConfig = registerAs('fieldEncryption', () => ({
  key: process.env.FIELD_ENCRYPTION_KEY ?? '',
  previousKeys: (process.env.FIELD_ENCRYPTION_PREVIOUS_KEYS ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean),
  hashKey: process.env.FIELD_HASH_KEY ?? '',
}));
