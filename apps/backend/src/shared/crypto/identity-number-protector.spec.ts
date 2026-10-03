import { IdentityNumberProtector } from './identity-number-protector';
import { testFieldCipher } from './testing';

describe('IdentityNumberProtector', () => {
  const cipher = testFieldCipher();
  const protector = new IdentityNumberProtector(cipher);

  it('stores the number encrypted, never in plain text, with a hash for lookups', () => {
    const sealed = protector.seal('ABCDE1234F');

    expect(sealed.documentNumber).not.toContain('ABCDE1234F');
    expect(cipher.isEncrypted(sealed.documentNumber as string)).toBe(true);
    expect(sealed.documentNumberHash).toBe(protector.hash('ABCDE1234F'));
  });

  it('treats the same number typed differently as the same number', () => {
    expect(protector.hash(' abcde-1234f ')).toBe(protector.hash('ABCDE1234F'));
    expect(protector.hash('1234 5678 9012')).toBe(protector.hash('123456789012'));
    expect(protector.reveal({ documentNumber: protector.seal('abcde 1234f').documentNumber }).documentNumber).toBe('ABCDE1234F');
  });

  it('stores nothing when there is no number', () => {
    expect(protector.seal(undefined)).toEqual({ documentNumber: null, documentNumberHash: null });
    expect(protector.seal('  ')).toEqual({ documentNumber: null, documentNumberHash: null });
  });

  it('masks by default and drops the hash from what it returns', () => {
    const row = { id: 'doc-1', ...protector.seal('ABCDE1234F') };

    expect(protector.mask(row)).toEqual({ id: 'doc-1', documentNumber: '****234F' });
    expect(protector.reveal(row)).toEqual({ id: 'doc-1', documentNumber: 'ABCDE1234F' });
  });

  it('still reads a row written before the backfill, in plain text', () => {
    expect(protector.mask({ documentNumber: 'ABCDE1234F', documentNumberHash: null }).documentNumber).toBe('****234F');
    expect(protector.open('ABCDE1234F')).toBe('ABCDE1234F');
  });

  it('keeps a missing number missing', () => {
    expect(protector.mask({ documentNumber: null }).documentNumber).toBeNull();
    expect(protector.encrypt(null)).toBeNull();
  });
});
