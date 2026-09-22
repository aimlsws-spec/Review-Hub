import { hmacSha256Hex, signatureMatches } from './hmac';

describe('hmac', () => {
  const secret = 'a-secret';
  const payload = '{"event":"payment.captured"}';
  const good = hmacSha256Hex(payload, secret);

  describe('hmacSha256Hex', () => {
    it('matches the published HMAC-SHA256 test vector (RFC 4231, case 2)', () => {
      expect(hmacSha256Hex('what do ya want for nothing?', 'Jefe')).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
    });

    it('gives the same answer for a string and for the same bytes', () => {
      expect(hmacSha256Hex(Buffer.from(payload, 'utf8'), secret)).toBe(good);
    });
  });

  describe('signatureMatches', () => {
    it('accepts the right signature', () => {
      expect(signatureMatches(payload, good, secret)).toBe(true);
    });

    it('accepts capital letters in the hex, since hex is not case-sensitive', () => {
      expect(signatureMatches(payload, good.toUpperCase(), secret)).toBe(true);
    });

    it('refuses a body changed by a single character', () => {
      expect(signatureMatches(payload.replace('captured', 'capturex'), good, secret)).toBe(false);
    });

    it('refuses a body with different spacing, though it means the same', () => {
      expect(signatureMatches('{ "event": "payment.captured" }', good, secret)).toBe(false);
    });

    it('refuses a signature made with another secret', () => {
      expect(signatureMatches(payload, hmacSha256Hex(payload, 'another-secret'), secret)).toBe(false);
    });

    it('refuses everything when there is no secret, even a signature made with no secret', () => {
      expect(signatureMatches(payload, hmacSha256Hex(payload, ''), '')).toBe(false);
      expect(signatureMatches(payload, good, '')).toBe(false);
    });

    it.each([
      ['nothing', undefined],
      ['null', null],
      ['an empty string', ''],
      ['a number', 12345],
      ['an object', { sig: good }],
      ['an array', [good]],
      ['too short', good.slice(0, 63)],
      ['too long', `${good}0`],
      ['not hex', 'z'.repeat(64)],
      ['with a space', ` ${good.slice(1)}`],
      ['with a 0x prefix', `0x${good.slice(2)}`],
    ])('refuses a signature that is %s', (_label, signature) => {
      expect(signatureMatches(payload, signature, secret)).toBe(false);
    });

    it('compares in constant time: it does not use a string comparison that stops at the first difference', () => {
      // Not a timing measurement (too noisy to be a good test). It checks the guarantee that makes one unnecessary:
      // the comparison is over fixed-length buffers, so a wrong signature of the right length is judged like any other.
      const firstByteWrong = `${good[0] === '0' ? '1' : '0'}${good.slice(1)}`;
      const lastByteWrong = `${good.slice(0, 63)}${good[63] === '0' ? '1' : '0'}`;

      expect(signatureMatches(payload, firstByteWrong, secret)).toBe(false);
      expect(signatureMatches(payload, lastByteWrong, secret)).toBe(false);
    });

    it('verifies the bytes it is given, including ones that are not valid text', () => {
      const bytes = Buffer.from([0x7b, 0xff, 0xfe, 0x7d]);
      expect(signatureMatches(bytes, hmacSha256Hex(bytes, secret), secret)).toBe(true);
      // Turned into text and back, those bytes change, and so does their signature.
      expect(signatureMatches(bytes.toString('utf8'), hmacSha256Hex(bytes, secret), secret)).toBe(false);
    });
  });
});
