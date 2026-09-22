/**
 * IP address and CIDR range matching for IPv4 and IPv6, with no dependencies. Addresses are handled as
 * big integers, so one code path covers both families and a range is just a [start, end] pair.
 */

export type IpFamily = 4 | 6;

export interface ParsedIp {
  family: IpFamily;
  value: bigint;
}

export interface IpRange {
  family: IpFamily;
  start: bigint;
  end: bigint;
}

const FAMILY_BITS: Record<IpFamily, number> = { 4: 32, 6: 128 };
const IPV4_MAPPED_PREFIX = 0xffffn;

function parseIPv4(text: string): bigint | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;

  let value = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = (value << 8n) | BigInt(octet);
  }
  return value;
}

function parseIPv6(text: string): bigint | null {
  let address = text;

  // An IPv4 tail such as ::ffff:1.2.3.4 stands for the last two 16-bit groups.
  if (address.includes('.')) {
    const split = address.lastIndexOf(':');
    const v4 = parseIPv4(address.slice(split + 1));
    if (v4 === null) return null;
    address = `${address.slice(0, split + 1)}${(v4 >> 16n).toString(16)}:${(v4 & 0xffffn).toString(16)}`;
  }

  const halves = address.split('::');
  if (halves.length > 2) return null;

  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];

  let groups: string[];
  if (halves.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    // "::" must stand for at least one group of zeros.
    if (head.length + tail.length > 7) return null;
    groups = [...head, ...Array<string>(8 - head.length - tail.length).fill('0'), ...tail];
  }

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }
  return value;
}

/** Parses an IPv4 or IPv6 address. An IPv4 address written in IPv6 form (::ffff:1.2.3.4) is treated as IPv4. */
export function parseIp(input: string): ParsedIp | null {
  let text = input.trim();
  if (text.startsWith('[') && text.endsWith(']')) text = text.slice(1, -1);
  const zone = text.indexOf('%');
  if (zone !== -1) text = text.slice(0, zone);
  if (!text) return null;

  if (!text.includes(':')) {
    const value = parseIPv4(text);
    return value === null ? null : { family: 4, value };
  }

  const value = parseIPv6(text);
  if (value === null) return null;
  if (value >> 32n === IPV4_MAPPED_PREFIX) return { family: 4, value: value & 0xffffffffn };
  return { family: 6, value };
}

/** Parses "1.2.3.0/24", "2001:db8::/32" or a single address (which is a range of one). */
export function parseCidr(input: string): IpRange | null {
  const text = input.trim();
  const slash = text.indexOf('/');
  const address = parseIp(slash === -1 ? text : text.slice(0, slash));
  if (!address) return null;

  const bits = FAMILY_BITS[address.family];
  let prefix = bits;
  if (slash !== -1) {
    const rawPrefix = text.slice(slash + 1);
    if (!/^\d{1,3}$/.test(rawPrefix)) return null;
    prefix = Number(rawPrefix);
    // A prefix written for the wrong family (e.g. /64 on an IPv4 address) is a mistake, not a range.
    if (prefix > bits) return null;
  }

  const hostBits = BigInt(bits - prefix);
  const start = (address.value >> hostBits) << hostBits;
  const end = start | ((1n << hostBits) - 1n);
  return { family: address.family, start, end };
}

/** A set of IP ranges that answers "is this address inside any of them?" in logarithmic time. */
export class CidrSet {
  private readonly ranges: Record<IpFamily, IpRange[]> = { 4: [], 6: [] };

  /**
   * Reads one range per line. Blank lines and anything after "#" are ignored, so the plain-text lists
   * published for this purpose can be used as they are. Lines that are not valid ranges are skipped.
   */
  static fromText(text: string): CidrSet {
    const set = new CidrSet();
    for (const line of text.split(/\r?\n/)) {
      const entry = line.split('#')[0].trim();
      if (entry) set.add(entry);
    }
    set.finish();
    return set;
  }

  static fromEntries(entries: string[]): CidrSet {
    const set = new CidrSet();
    for (const entry of entries) set.add(entry);
    set.finish();
    return set;
  }

  /** Returns false (and adds nothing) if the text is not a valid address or range. */
  add(entry: string): boolean {
    const range = parseCidr(entry);
    if (!range) return false;
    this.ranges[range.family].push(range);
    return true;
  }

  /** Sorts and merges overlapping ranges. Call once after adding; `contains` relies on it. */
  finish(): void {
    for (const family of [4, 6] as const) {
      const sorted = this.ranges[family].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
      const merged: IpRange[] = [];
      for (const range of sorted) {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end + 1n) {
          if (range.end > last.end) last.end = range.end;
        } else {
          merged.push({ ...range });
        }
      }
      this.ranges[family] = merged;
    }
  }

  /** Number of distinct (merged) ranges. */
  get size(): number {
    return this.ranges[4].length + this.ranges[6].length;
  }

  contains(ip: string | ParsedIp): boolean {
    const parsed = typeof ip === 'string' ? parseIp(ip) : ip;
    if (!parsed) return false;

    const ranges = this.ranges[parsed.family];
    let low = 0;
    let high = ranges.length - 1;
    while (low <= high) {
      const middle = (low + high) >> 1;
      const range = ranges[middle];
      if (parsed.value < range.start) high = middle - 1;
      else if (parsed.value > range.end) low = middle + 1;
      else return true;
    }
    return false;
  }
}

/** Addresses that are never a real user's public address: private networks, loopback, link-local. */
const PRIVATE_RANGES = CidrSet.fromEntries([
  '0.0.0.0/8',
  '10.0.0.0/8',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '::/128',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
]);

/** True for a private or local address, which says nothing about the user (e.g. a developer's machine, or a proxy hop). */
export function isPrivateIp(ip: string): boolean {
  return PRIVATE_RANGES.contains(ip);
}
