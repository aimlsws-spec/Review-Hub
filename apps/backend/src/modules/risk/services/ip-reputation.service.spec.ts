import { ConfigService } from '@nestjs/config';

import { IpReputationService } from './ip-reputation.service';

describe('IpReputationService', () => {
  const build = (settings: { lists?: Array<{ name: string; url: string }>; extra?: string[]; hours?: number } = {}) => {
    const config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        const values: Record<string, unknown> = {
          'risk.ipLists': settings.lists ?? [],
          'risk.ipExtraCidrs': settings.extra ?? [],
          'risk.ipRefreshHours': settings.hours ?? 24,
        };
        return key in values ? values[key] : fallback;
      }),
    } as unknown as ConfigService;
    return new IpReputationService(config);
  };

  const okResponse = (body: string) => ({ ok: true, status: 200, text: async () => body }) as Response;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('with nothing configured', () => {
    it('cannot judge any public address, so it says UNKNOWN and callers behave as before', () => {
      const service = build();
      service.onModuleInit();

      expect(service.assess('8.8.8.8')).toEqual({ verdict: 'UNKNOWN', sources: [] });
      expect(service.isAnonymizer('8.8.8.8')).toBe(false);
      expect(service.hasData).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('still recognises private and local addresses', () => {
      const service = build();
      service.onModuleInit();

      for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.10', '::1']) {
        expect(service.assess(ip)).toEqual({ verdict: 'PRIVATE', sources: [] });
      }
    });

    it('says UNKNOWN for a missing or malformed address', () => {
      const service = build();
      service.onModuleInit();

      for (const ip of [undefined, null, '', 'not-an-ip', '999.1.1.1']) {
        expect(service.assess(ip)).toEqual({ verdict: 'UNKNOWN', sources: [] });
      }
    });

    it('does not start a background timer when there is nothing to download', () => {
      build().onModuleInit();

      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('with your own ranges (IP_REPUTATION_EXTRA_CIDRS)', () => {
    it('flags addresses inside them as a watch-list match, and clears everything else', () => {
      const service = build({ extra: ['203.0.113.0/24', '198.51.100.7'] });
      service.onModuleInit();

      expect(service.assess('203.0.113.99')).toEqual({ verdict: 'ANONYMIZER', sources: ['watch-list'] });
      expect(service.assess('198.51.100.7')).toEqual({ verdict: 'ANONYMIZER', sources: ['watch-list'] });
      expect(service.assess('198.51.100.8')).toEqual({ verdict: 'CLEAN', sources: [] });
      expect(service.hasData).toBe(true);
    });

    it('works with IPv6 ranges and IPv4-in-IPv6 addresses', () => {
      const service = build({ extra: ['2001:db8::/32', '203.0.113.0/24'] });
      service.onModuleInit();

      expect(service.assess('2001:db8::1').verdict).toBe('ANONYMIZER');
      expect(service.assess('::ffff:203.0.113.5').verdict).toBe('ANONYMIZER');
      expect(service.assess('2001:db9::1').verdict).toBe('CLEAN');
    });

    it('never flags a private address, even one inside a listed range', () => {
      const service = build({ extra: ['10.0.0.0/8'] });
      service.onModuleInit();

      expect(service.assess('10.1.2.3').verdict).toBe('PRIVATE');
    });

    it('ignores an invalid entry rather than failing to start', () => {
      const service = build({ extra: ['garbage', '203.0.113.0/24'] });
      service.onModuleInit();

      expect(service.assess('203.0.113.5').verdict).toBe('ANONYMIZER');
    });
  });

  describe('with downloadable lists (IP_REPUTATION_LISTS)', () => {
    const vpn = { name: 'vpn', url: 'https://lists.example/vpn.txt' };
    const tor = { name: 'tor', url: 'https://lists.example/tor.txt' };

    it('downloads each list at start-up without holding up the app, and answers from memory afterwards', async () => {
      fetchMock.mockImplementation(async (url: string) => okResponse(url.includes('vpn') ? '# vpn\n203.0.113.0/24\n' : '198.51.100.0/24\n'));
      const service = build({ lists: [vpn, tor] });

      service.onModuleInit();
      await service.refresh();

      expect(fetchMock).toHaveBeenCalledWith(vpn.url, expect.objectContaining({ signal: expect.anything() }));
      expect(fetchMock).toHaveBeenCalledWith(tor.url, expect.anything());
      expect(service.assess('203.0.113.4')).toEqual({ verdict: 'ANONYMIZER', sources: ['vpn'] });
      expect(service.assess('198.51.100.4')).toEqual({ verdict: 'ANONYMIZER', sources: ['tor'] });
      expect(service.assess('8.8.8.8')).toEqual({ verdict: 'CLEAN', sources: [] });
    });

    it('names every list that matches', async () => {
      fetchMock.mockResolvedValue(okResponse('203.0.113.0/24'));
      const service = build({ lists: [vpn, tor], extra: ['203.0.113.0/24'] });

      service.onModuleInit();
      await service.refresh();

      expect(service.assess('203.0.113.4').sources.sort()).toEqual(['tor', 'vpn', 'watch-list']);
    });

    it('says UNKNOWN, not CLEAN, until the first download has finished: an empty answer must not read as "all clear"', () => {
      fetchMock.mockReturnValue(new Promise(() => undefined)); // never resolves
      const service = build({ lists: [vpn] });

      service.onModuleInit();

      expect(service.assess('8.8.8.8').verdict).toBe('UNKNOWN');
    });

    it('keeps the last good copy when a refresh fails, instead of forgetting everything', async () => {
      fetchMock.mockResolvedValueOnce(okResponse('203.0.113.0/24')).mockResolvedValue({ ok: false, status: 503, text: async () => '' });
      const service = build({ lists: [vpn] });

      service.onModuleInit();
      await service.refresh();
      await service.refresh();

      expect(service.assess('203.0.113.4').verdict).toBe('ANONYMIZER');
    });

    it('keeps the last good copy when the network call itself throws', async () => {
      fetchMock.mockResolvedValueOnce(okResponse('203.0.113.0/24')).mockRejectedValue(new Error('ECONNRESET'));
      const service = build({ lists: [vpn] });

      service.onModuleInit();
      await service.refresh();
      await expect(service.refresh()).resolves.toBeUndefined();

      expect(service.assess('203.0.113.4').verdict).toBe('ANONYMIZER');
    });

    it('does not replace a good list with an error page that contains no ranges', async () => {
      fetchMock.mockResolvedValueOnce(okResponse('203.0.113.0/24')).mockResolvedValue(okResponse('<html>Service Unavailable</html>'));
      const service = build({ lists: [vpn] });

      service.onModuleInit();
      await service.refresh();
      await service.refresh();

      expect(service.assess('203.0.113.4').verdict).toBe('ANONYMIZER');
    });

    it('refuses a list that never loaded at all when it has no ranges', async () => {
      fetchMock.mockResolvedValue(okResponse('<html>nope</html>'));
      const service = build({ lists: [vpn] });

      service.onModuleInit();
      await service.refresh();

      expect(service.hasData).toBe(false);
      expect(service.assess('8.8.8.8').verdict).toBe('UNKNOWN');
    });

    it('refuses an implausibly huge response', async () => {
      fetchMock.mockResolvedValue(okResponse('1.2.3.4\n'.repeat(5_000_000))); // ~40 MB
      const service = build({ lists: [vpn] });

      service.onModuleInit();
      await service.refresh();

      expect(service.hasData).toBe(false);
    });

    it('one broken list does not stop the others loading', async () => {
      fetchMock.mockImplementation(async (url: string) => (url.includes('vpn') ? ({ ok: false, status: 500, text: async () => '' } as Response) : okResponse('198.51.100.0/24')));
      const service = build({ lists: [vpn, tor] });

      service.onModuleInit();
      await service.refresh();

      expect(service.assess('198.51.100.4')).toEqual({ verdict: 'ANONYMIZER', sources: ['tor'] });
    });

    it('refreshes on a timer in the configured number of hours, and stops when the app shuts down', async () => {
      fetchMock.mockResolvedValue(okResponse('203.0.113.0/24'));
      const service = build({ lists: [vpn], hours: 6 });

      service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      const afterStart = fetchMock.mock.calls.length;

      await jest.advanceTimersByTimeAsync(6 * 60 * 60 * 1000 - 1);
      expect(fetchMock.mock.calls.length).toBe(afterStart);
      await jest.advanceTimersByTimeAsync(1);
      expect(fetchMock.mock.calls.length).toBe(afterStart + 1);

      service.onModuleDestroy();
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
