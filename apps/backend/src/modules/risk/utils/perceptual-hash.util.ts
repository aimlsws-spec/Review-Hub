const HASH_HEX_PATTERN = /^[0-9a-f]{16}$/;

/** True for exactly 16 lowercase hex characters, the form the AI service sends a 64-bit hash in. */
export function isValidHashHex(value: unknown): value is string {
  return typeof value === 'string' && HASH_HEX_PATTERN.test(value);
}

/**
 * The 64 bits as a signed BIGINT, which is what MySQL stores. Same bits, just read as two's complement,
 * so MySQL's `BIT_COUNT(a ^ b)` counts the differing bits correctly.
 */
export function hexToSignedBigInt(hex: string): bigint {
  return BigInt.asIntN(64, BigInt(`0x${hex}`));
}

export function signedBigIntToHex(value: bigint): string {
  return BigInt.asUintN(64, value).toString(16).padStart(16, '0');
}

/** How many of the 64 bits differ. The database does this in SQL; this exists for tests and for reading results. */
export function hammingDistance(a: bigint, b: bigint): number {
  let differing = BigInt.asUintN(64, a ^ b);
  let count = 0;
  while (differing > 0n) {
    count += Number(differing & 1n);
    differing >>= 1n;
  }
  return count;
}
