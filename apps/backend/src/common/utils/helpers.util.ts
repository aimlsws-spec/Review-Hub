import * as crypto from 'crypto';

export function generateOtp(length = 6): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return '****';
  return `****${phone.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  const masked = local.length > 2 ? `${local[0]}****${local.slice(-1)}` : '****';
  return `${masked}@${domain}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function omitKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function pickKeys<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      if (key in obj) acc[key] = obj[key];
      return acc;
    },
    {} as Pick<T, K>,
  );
}

/**
 * Third-party SDKs (Razorpay included) often reject with a plain object
 * instead of a real Error, so `.message`/`.stack` can't be trusted blindly —
 * this pulls a useful string out regardless of what shape the thrown value
 * turns out to have, instead of silently logging "undefined" or "[object Object]".
 */
export function describeError(exception: unknown): string {
  if (exception instanceof Error) return exception.message;

  if (typeof exception === 'object' && exception !== null) {
    const err = exception as Record<string, unknown>;

    // Razorpay SDK shape: { error: { description, code } }
    const nested = err['error'];
    if (typeof nested === 'object' && nested !== null && typeof (nested as Record<string, unknown>)['description'] === 'string') {
      return (nested as Record<string, unknown>)['description'] as string;
    }

    if (typeof err['message'] === 'string') return err['message'];

    try {
      return JSON.stringify(exception);
    } catch {
      // fall through to String() below
    }
  }

  return String(exception);
}
