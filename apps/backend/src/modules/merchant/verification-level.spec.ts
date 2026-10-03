import { merchantVerificationLevel } from './verification-level';

describe('merchantVerificationLevel', () => {
  const none = { phoneVerified: false, emailVerified: false, businessVerified: false, premium: false };

  it.each([
    [{}, 0],
    [{ phoneVerified: true }, 1],
    [{ phoneVerified: true, emailVerified: true }, 2],
    [{ phoneVerified: true, emailVerified: true, businessVerified: true }, 3],
    [{ phoneVerified: true, emailVerified: true, businessVerified: true, premium: true }, 4],
  ])('%j is L%i', (facts, level) => {
    expect(merchantVerificationLevel({ ...none, ...facts })).toBe(level);
  });

  it('stops at the first missing step, since each level builds on the one before', () => {
    expect(merchantVerificationLevel({ ...none, phoneVerified: true, businessVerified: true, premium: true })).toBe(1);
    expect(merchantVerificationLevel({ ...none, emailVerified: true, businessVerified: true })).toBe(0);
  });
});
