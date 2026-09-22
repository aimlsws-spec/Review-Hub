import { registerAs } from '@nestjs/config';

/**
 * How many proxies sit in front of the app, in Express's `trust proxy` form: false (default), a number of
 * hops, or a list of trusted addresses/keywords such as "loopback". Without this, the client IP is the
 * proxy's address and every IP-based signal (reputation, shared IPs, rate limits) sees one "user".
 * Never set it to true unless the app is reachable only through a proxy: it lets any client forge its IP.
 */
export function parseTrustProxy(value: string | undefined): boolean | number | string {
  const text = (value ?? '').trim();
  if (!text || text.toLowerCase() === 'false') return false;
  if (text.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(text)) return Number(text);
  return text;
}

export function parseCsv(value: string | undefined): string[] {
  return (value ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

export interface IpListSpec {
  name: string;
  url: string;
}

/** "vpn=https://a/list.txt,tor=https://b/list.txt" -> named lists. Only http(s) URLs are accepted; anything else is dropped. */
export function parseIpListSpecs(value: string | undefined): IpListSpec[] {
  const specs: IpListSpec[] = [];
  for (const entry of parseCsv(value)) {
    const separator = entry.indexOf('=');
    if (separator <= 0) continue;
    const name = entry.slice(0, separator).trim();
    const url = entry.slice(separator + 1).trim();
    if (name && /^https?:\/\//i.test(url)) specs.push({ name, url });
  }
  return specs;
}

export const riskConfig = registerAs('risk', () => ({
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  ipLists: parseIpListSpecs(process.env.IP_REPUTATION_LISTS),
  ipExtraCidrs: parseCsv(process.env.IP_REPUTATION_EXTRA_CIDRS),
  ipRefreshHours: Math.max(1, Number(process.env.IP_REPUTATION_REFRESH_HOURS) || 24),
}));
