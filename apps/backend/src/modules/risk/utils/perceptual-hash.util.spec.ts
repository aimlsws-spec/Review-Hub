import { hammingDistance, hexToSignedBigInt, isValidHashHex, signedBigIntToHex } from './perceptual-hash.util';

describe('perceptual hash helpers', () => {
  describe('isValidHashHex', () => {
    it('accepts exactly 16 lowercase hex characters', () => {
      expect(isValidHashHex('9f3a1c0e7b2d4a58')).toBe(true);
      expect(isValidHashHex('0000000000000000')).toBe(true);
      expect(isValidHashHex('ffffffffffffffff')).toBe(true);
    });

    it.each(['', '9f3a1c0e7b2d4a5', '9f3a1c0e7b2d4a588', '9F3A1C0E7B2D4A58', '9f3a1c0e7b2d4a5g', ' 9f3a1c0e7b2d4a58'])(
      'rejects %j',
      (value) => expect(isValidHashHex(value)).toBe(false),
    );

    it('rejects things that are not strings', () => {
      expect(isValidHashHex(null)).toBe(false);
      expect(isValidHashHex(undefined)).toBe(false);
      expect(isValidHashHex(123456789)).toBe(false);
    });
  });

  describe('conversion to and from the signed BIGINT MySQL stores', () => {
    it('keeps small values as they are', () => {
      expect(hexToSignedBigInt('0000000000000001')).toBe(1n);
      expect(hexToSignedBigInt('0000000000000000')).toBe(0n);
    });

    it('turns a hash with the top bit set into a negative number, which is how MySQL sees the same 64 bits', () => {
      expect(hexToSignedBigInt('ffffffffffffffff')).toBe(-1n);
      expect(hexToSignedBigInt('8000000000000000')).toBe(-(2n ** 63n));
    });

    it('fits in a signed 64-bit column for every possible hash', () => {
      for (const hex of ['0000000000000000', '7fffffffffffffff', '8000000000000000', 'ffffffffffffffff', '9f3a1c0e7b2d4a58']) {
        const value = hexToSignedBigInt(hex);
        expect(value >= -(2n ** 63n) && value < 2n ** 63n).toBe(true);
      }
    });

    it('round-trips without losing a bit', () => {
      for (const hex of ['0000000000000000', '0000000000000001', '7fffffffffffffff', '8000000000000000', 'ffffffffffffffff', '9f3a1c0e7b2d4a58', '00ab00cd00ef0012']) {
        expect(signedBigIntToHex(hexToSignedBigInt(hex))).toBe(hex);
      }
    });
  });

  describe('hammingDistance', () => {
    const d = (a: string, b: string) => hammingDistance(hexToSignedBigInt(a), hexToSignedBigInt(b));

    it('is zero for identical hashes', () => {
      expect(d('9f3a1c0e7b2d4a58', '9f3a1c0e7b2d4a58')).toBe(0);
    });

    it('counts the bits that differ', () => {
      expect(d('0000000000000000', '0000000000000001')).toBe(1);
      expect(d('0000000000000000', '00000000000000ff')).toBe(8);
      expect(d('0000000000000000', 'ffffffffffffffff')).toBe(64);
    });

    it('counts correctly across the sign bit, the case a signed database column could get wrong', () => {
      expect(d('7fffffffffffffff', '8000000000000000')).toBe(64);
      expect(d('8000000000000000', '8000000000000001')).toBe(1);
      expect(d('ffffffffffffffff', 'fffffffffffffffe')).toBe(1);
    });

    it('is symmetric', () => {
      expect(d('9f3a1c0e7b2d4a58', '0123456789abcdef')).toBe(d('0123456789abcdef', '9f3a1c0e7b2d4a58'));
    });
  });
});
