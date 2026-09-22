/** Reads the leading major.minor.patch of a version such as "1.4.2", "1.4.2+7" or "1.4.2-beta". Anything else is not a version. */
export function parseVersion(value: string | undefined | null): [number, number, number] | null {
  const match = /^\s*v?(\d{1,6})\.(\d{1,6})\.(\d{1,6})(?:[+-].*)?\s*$/.exec(value ?? '');
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * True only when both are real versions and [version] is older than [minimum]. A value that is not a version is never
 * "older": refusing on a header nobody can read would lock out people for a mistake that is not theirs.
 */
export function isOlderThan(version: string | undefined | null, minimum: string | undefined | null): boolean {
  const current = parseVersion(version);
  const required = parseVersion(minimum);
  if (!current || !required) return false;

  for (let i = 0; i < 3; i += 1) {
    if (current[i] !== required[i]) return current[i] < required[i];
  }
  return false;
}
