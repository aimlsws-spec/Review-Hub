import { testBankDetailsProtector, testFieldCipher } from './testing';

describe('BankDetailsProtector', () => {
  const protector = testBankDetailsProtector();
  const cipher = testFieldCipher();

  describe('seal', () => {
    it('stores the number and UPI ID encrypted, with a hash and the last four digits', () => {
      const sealed = protector.seal({ accountNumber: '1234 5678 9012', upiId: ' jane@okhdfc ' });

      expect(sealed.accountNumber).not.toContain('123456789012');
      expect(cipher.decrypt(sealed.accountNumber)).toBe('123456789012');
      expect(cipher.decrypt(sealed.upiId as string)).toBe('jane@okhdfc');
      expect(sealed.accountNumberLast4).toBe('9012');
      expect(sealed.accountNumberHash).toBe(protector.hashAccountNumber('123456789012'));
    });

    it('hashes the number the same however it was typed', () => {
      expect(protector.hashAccountNumber('1234-5678-9012')).toBe(protector.hashAccountNumber('123456789012'));
    });

    it('stores no UPI ID as null', () => {
      expect(protector.seal({ accountNumber: '123456789012' }).upiId).toBeNull();
      expect(protector.sealUpi('  ')).toBeNull();
    });
  });

  describe('reading', () => {
    const stored = { id: 'bank-1', ...protector.seal({ accountNumber: '123456789012', upiId: 'jane@okhdfc' }) };

    it('masks the number, shows the UPI ID, and drops the hash', () => {
      const masked = protector.mask(stored);

      expect(masked.accountNumber).toBe('XXXX9012');
      expect(masked.upiId).toBe('jane@okhdfc');
      expect(masked).not.toHaveProperty('accountNumberHash');
      expect(masked.id).toBe('bank-1');
    });

    it('reveals the real number only when asked', () => {
      expect(protector.reveal(stored).accountNumber).toBe('123456789012');
      expect(protector.reveal(stored)).not.toHaveProperty('accountNumberHash');
    });

    it('reads a row from before encryption the same way', () => {
      const legacy = { accountNumber: '987654321098', upiId: 'old@upi', accountNumberHash: null, accountNumberLast4: null };

      expect(protector.mask(legacy).accountNumber).toBe('XXXX1098');
      expect(protector.reveal(legacy).accountNumber).toBe('987654321098');
      expect(protector.mask(legacy).upiId).toBe('old@upi');
    });

    it('masks or reveals the bank account inside a withdrawal, and leaves one without it alone', () => {
      const withdrawal = { id: 'w-1', bankAccount: stored };

      expect(protector.maskNested(withdrawal).bankAccount.accountNumber).toBe('XXXX9012');
      expect(protector.revealNested(withdrawal).bankAccount.accountNumber).toBe('123456789012');
      expect(protector.maskNested({ id: 'w-2', bankAccount: null })).toEqual({ id: 'w-2', bankAccount: null });
    });
  });
});
