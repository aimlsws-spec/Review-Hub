import { createHmac, timingSafeEqual } from 'crypto';

/** HMAC-SHA256 as lower-case hex, which is how Razorpay writes its signatures. */
export function hmacSha256Hex(payload: string | Buffer, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Whether `signature` is the HMAC-SHA256 of `payload` under `secret`.
 *
 * Two things this does that a plain `===` on the strings would not:
 * - It refuses when there is no secret. A signature made with an empty secret is one anyone can make, so accepting it
 *   would mean accepting anybody's word. Not having a secret configured must never mean "trust everyone".
 * - It compares in constant time, so how long the comparison takes gives an attacker nothing to guess a signature from.
 *
 * `payload` may be the raw bytes of a request. Verify those exact bytes: the same JSON written with different spacing
 * or key order has a different signature, and re-serialising a parsed body changes it.
 */
export function signatureMatches(payload: string | Buffer, signature: unknown, secret: string): boolean {
  if (!secret) return false;
  if (typeof signature !== 'string' || !/^[0-9a-fA-F]{64}$/.test(signature)) return false;

  const expected = Buffer.from(hmacSha256Hex(payload, secret), 'hex');
  const given = Buffer.from(signature, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}
