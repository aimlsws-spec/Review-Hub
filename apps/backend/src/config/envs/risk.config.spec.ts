import { parseCsv, parseIpListSpecs, parseTrustProxy, riskConfig } from './risk.config';

describe('parseTrustProxy', () => {
  it('is off unless asked for, because trusting X-Forwarded-For without a proxy lets any client forge its IP', () => {
    for (const value of [undefined, '', '   ', 'false', 'FALSE']) expect(parseTrustProxy(value)).toBe(false);
  });

  it('reads a number of proxy hops', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(' 2 ')).toBe(2);
  });

  it('reads "true"', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('TRUE')).toBe(true);
  });

  it('passes address lists and keywords through for Express to interpret', () => {
    expect(parseTrustProxy('loopback')).toBe('loopback');
    expect(parseTrustProxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8');
  });
});

describe('parseCsv', () => {
  it('splits, trims and drops empty entries', () => {
    expect(parseCsv(' a , b ,, c ')).toEqual(['a', 'b', 'c']);
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv(undefined)).toEqual([]);
  });
});

describe('parseIpListSpecs', () => {
  it('reads name=url pairs', () => {
    expect(parseIpListSpecs('vpn=https://a.example/list.txt, tor=http://b.example/x')).toEqual([
      { name: 'vpn', url: 'https://a.example/list.txt' },
      { name: 'tor', url: 'http://b.example/x' },
    ]);
  });

  it('keeps an equals sign inside the URL', () => {
    expect(parseIpListSpecs('vpn=https://a.example/list?format=txt')).toEqual([{ name: 'vpn', url: 'https://a.example/list?format=txt' }]);
  });

  it.each([
    ['a non-web scheme (would read local files)', 'vpn=file:///etc/passwd'],
    ['a scheme that could reach internal services', 'vpn=gopher://internal/'],
    ['no name', '=https://a.example/x'],
    ['no separator', 'https://a.example/x'],
    ['no URL', 'vpn='],
  ])('drops an entry with %s', (_label, value) => {
    expect(parseIpListSpecs(value)).toEqual([]);
  });

  it('keeps the valid entries when others are bad', () => {
    expect(parseIpListSpecs('bad=ftp://x, good=https://a.example/x')).toEqual([{ name: 'good', url: 'https://a.example/x' }]);
  });

  it('is empty when unset', () => {
    expect(parseIpListSpecs(undefined)).toEqual([]);
  });
});

describe('riskConfig', () => {
  const keys = ['TRUST_PROXY', 'IP_REPUTATION_LISTS', 'IP_REPUTATION_EXTRA_CIDRS', 'IP_REPUTATION_REFRESH_HOURS'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => keys.forEach((key) => { saved[key] = process.env[key]; delete process.env[key]; }));
  afterEach(() => keys.forEach((key) => { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }));

  it('has safe defaults: no proxy trusted, nothing downloaded, daily refresh', () => {
    expect(riskConfig()).toEqual({ trustProxy: false, ipLists: [], ipExtraCidrs: [], ipRefreshHours: 24 });
  });

  it('reads every setting from the environment', () => {
    process.env.TRUST_PROXY = '1';
    process.env.IP_REPUTATION_LISTS = 'vpn=https://a.example/x';
    process.env.IP_REPUTATION_EXTRA_CIDRS = '203.0.113.0/24, 198.51.100.7';
    process.env.IP_REPUTATION_REFRESH_HOURS = '12';

    expect(riskConfig()).toEqual({
      trustProxy: 1,
      ipLists: [{ name: 'vpn', url: 'https://a.example/x' }],
      ipExtraCidrs: ['203.0.113.0/24', '198.51.100.7'],
      ipRefreshHours: 12,
    });
  });

  it('never refreshes more often than hourly, and falls back to daily for a nonsense value', () => {
    process.env.IP_REPUTATION_REFRESH_HOURS = '0';
    expect(riskConfig().ipRefreshHours).toBe(24);
    process.env.IP_REPUTATION_REFRESH_HOURS = 'often';
    expect(riskConfig().ipRefreshHours).toBe(24);
    process.env.IP_REPUTATION_REFRESH_HOURS = '0.2';
    expect(riskConfig().ipRefreshHours).toBe(1);
  });
});
