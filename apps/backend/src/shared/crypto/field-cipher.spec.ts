import { FieldCipher } from './field-cipher';

describe('FieldCipher', () => {
  const key = (fill: number) => Buffer.alloc(32, fill).toString('base64');
  const cipher = new FieldCipher({ key: key(1), hashKey: key(2) });

  it('decrypts what it encrypted', () => {
    expect(cipher.decrypt(cipher.encrypt('123456789012'))).toBe('123456789012');
    expect(cipher.decrypt(cipher.encrypt('jane.doe@okhdfc'))).toBe('jane.doe@okhdfc');
  });

  it('never stores the value in a readable form, and never the same way twice', () => {
    const first = cipher.encrypt('123456789012');
    const second = cipher.encrypt('123456789012');

    expect(first).not.toContain('123456789012');
    expect(first).toMatch(/^enc:v1:[0-9a-f]{8}:/);
    expect(first).not.toBe(second);
  });

  it('refuses a value that was tampered with', () => {
    const parts = cipher.encrypt('123456789012').split(':');
    parts[5] = Buffer.from('999999999999').toString('base64url');

    expect(() => cipher.decrypt(parts.join(':'))).toThrow();
  });

  it('passes legacy plain text through, so rows written before encryption still read', () => {
    expect(cipher.decrypt('123456789012')).toBe('123456789012');
    expect(cipher.isEncrypted('123456789012')).toBe(false);
  });

  it('still reads values encrypted with a previous key after a key change', () => {
    const old = new FieldCipher({ key: key(3), hashKey: key(2) });
    const rotated = new FieldCipher({ key: key(1), previousKeys: [key(3)], hashKey: key(2) });

    expect(rotated.decrypt(old.encrypt('123456789012'))).toBe('123456789012');
    expect(() => cipher.decrypt(old.encrypt('123456789012'))).toThrow(/No key with id/);
  });

  it('gives the same hash for the same value, and a different one under another hash key', () => {
    const other = new FieldCipher({ key: key(1), hashKey: key(4) });

    expect(cipher.blindIndex('123456789012')).toBe(cipher.blindIndex('123456789012'));
    expect(cipher.blindIndex('123456789012')).not.toBe(cipher.blindIndex('123456789013'));
    expect(cipher.blindIndex('123456789012')).not.toBe(other.blindIndex('123456789012'));
    expect(cipher.blindIndex('123456789012')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses keys of the wrong size, and the same key for both jobs', () => {
    expect(() => new FieldCipher({ key: 'c2hvcnQ=', hashKey: key(2) })).toThrow(/32 bytes/);
    expect(() => new FieldCipher({ key: key(1), hashKey: key(1) })).toThrow(/must differ/);
  });
});
