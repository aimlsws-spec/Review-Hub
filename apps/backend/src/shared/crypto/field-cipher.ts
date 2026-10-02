import * as crypto from 'crypto';

/** Marks a stored value as encrypted by this code; anything without it is legacy plain text from before encryption. */
const PREFIX = 'enc:v1';
const IV_BYTES = 12;

/**
 * Only for development and tests: a fixed, publicly known key, so a fresh checkout runs without setup. The config
 * schema refuses to boot production without real keys, so these can never protect real data.
 */
export const DEVELOPMENT_ENCRYPTION_KEY = crypto.createHash('sha256').update('viral-kar-development-field-encryption').digest('base64');
export const DEVELOPMENT_HASH_KEY = crypto.createHash('sha256').update('viral-kar-development-field-hash').digest('base64');

export interface FieldCipherKeys {
  /** Base64, 32 bytes. New values are encrypted with this one. */
  key: string;
  /** Base64, 32 bytes each. Still accepted for reading, so values encrypted before a key change stay readable. */
  previousKeys?: string[];
  /** Base64, 32 bytes. For the keyed hash; must differ from the encryption key. */
  hashKey: string;
}

/**
 * Encrypts single column values with AES-256-GCM (confidential and tamper-evident), and makes keyed hashes
 * ("blind indexes") of them, so the database can still answer "is this the same account number?" without anyone
 * being able to read or brute-force the numbers from a copy of it.
 *
 * Stored form: `enc:v1:<key id>:<iv>:<auth tag>:<ciphertext>`, all base64url. The key id (first 8 hex characters
 * of SHA-256 of the key) says which key to decrypt with, which is what makes a key change possible.
 */
export class FieldCipher {
  private readonly current: { id: string; key: Buffer };
  private readonly keysById = new Map<string, Buffer>();
  private readonly hashKey: Buffer;

  constructor(keys: FieldCipherKeys) {
    const key = FieldCipher.decodeKey(keys.key, 'encryption');
    this.current = { id: FieldCipher.keyId(key), key };
    for (const k of [key, ...(keys.previousKeys ?? []).map((p) => FieldCipher.decodeKey(p, 'previous encryption'))]) {
      this.keysById.set(FieldCipher.keyId(k), k);
    }
    this.hashKey = FieldCipher.decodeKey(keys.hashKey, 'hash');
    if (this.hashKey.equals(key)) throw new Error('The hash key must differ from the encryption key');
  }

  encrypt(plain: string): string {
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.current.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [PREFIX, this.current.id, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join(':');
  }

  /**
   * The plain value. Legacy plain text (written before encryption, not yet backfilled) is returned as it is, so
   * reading never breaks while the backfill has not run. Throws if a value was tampered with or its key is gone.
   */
  decrypt(stored: string): string {
    if (!this.isEncrypted(stored)) return stored;
    const [, , keyId, iv, tag, ciphertext] = stored.split(':');
    const key = this.keysById.get(keyId);
    if (!key) throw new Error(`No key with id ${keyId} is configured to decrypt this value`);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  }

  isEncrypted(stored: string): boolean {
    return stored.startsWith(`${PREFIX}:`) && stored.split(':').length === 6;
  }

  /** Keyed hash for equality lookups. The caller normalises first, so "same value" means the same thing everywhere. */
  blindIndex(normalised: string): string {
    return crypto.createHmac('sha256', this.hashKey).update(normalised, 'utf8').digest('hex');
  }

  private static decodeKey(base64: string, label: string): Buffer {
    const key = Buffer.from(base64, 'base64');
    if (key.length !== 32) throw new Error(`The ${label} key must be 32 bytes, base64-encoded`);
    return key;
  }

  private static keyId(key: Buffer): string {
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
  }
}
