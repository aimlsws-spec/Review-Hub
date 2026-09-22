/** The bank's own reference for a transfer (UTR or transaction id): letters, digits, dashes and slashes, no spaces. */
export const BANK_REFERENCE_PATTERN = /^[A-Za-z0-9/-]{6,40}$/;

export const BANK_REFERENCE_MESSAGE = 'must be 6 to 40 letters, digits, dashes or slashes, with no spaces';

/** References are compared without case or spaces, so "utr 123" and "UTR123" are the same transfer. */
export function normalizeBankReference(reference: string): string {
  return reference.replace(/\s+/g, '').toUpperCase();
}
