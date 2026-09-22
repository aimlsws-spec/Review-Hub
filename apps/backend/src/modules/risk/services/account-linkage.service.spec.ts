import { Test, TestingModule } from '@nestjs/testing';

import { IP_LOOKBACK_DAYS, IP_MAX_SHARING_ACCOUNTS, LINK_HOLD_POINTS, LINKED_ACCOUNTS_LIMIT } from '../constants';
import { AccountLinkageRepository } from '../repositories';

import { AccountLinkageService } from './account-linkage.service';

describe('AccountLinkageService', () => {
  let service: AccountLinkageService;

  const mockRepository = {
    panNumbersOf: jest.fn(),
    usersSharingPan: jest.fn(),
    bankKeysOf: jest.fn(),
    usersSharingBankAccounts: jest.fn(),
    installIdsOf: jest.fn(),
    usersSharingInstallIds: jest.fn(),
    recentIpsOf: jest.fn(),
    accountsByIp: jest.fn(),
    userSummaries: jest.fn(),
  };

  /** Sets who shares what with user-1. Anything not mentioned is empty. */
  const arrange = (links: { pan?: string[]; bank?: string[]; device?: string[]; ips?: Record<string, string[]> } = {}) => {
    mockRepository.panNumbersOf.mockResolvedValue(links.pan ? ['ABCDE1234F'] : []);
    mockRepository.usersSharingPan.mockResolvedValue(links.pan ?? []);
    mockRepository.bankKeysOf.mockResolvedValue(links.bank ? [{ accountNumber: '111', ifscCode: 'HDFC0001' }] : []);
    mockRepository.usersSharingBankAccounts.mockResolvedValue(links.bank ?? []);
    mockRepository.installIdsOf.mockResolvedValue(links.device ? ['install-hash'] : []);
    mockRepository.usersSharingInstallIds.mockResolvedValue(links.device ?? []);
    mockRepository.recentIpsOf.mockResolvedValue(Object.keys(links.ips ?? {}));
    mockRepository.accountsByIp.mockResolvedValue(new Map(Object.entries(links.ips ?? {})));
    mockRepository.userSummaries.mockImplementation(async (ids: string[]) =>
      ids.map((id) => ({ id, firstName: `First-${id}`, lastName: 'Person', status: 'ACTIVE' })),
    );
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountLinkageService, { provide: AccountLinkageRepository, useValue: mockRepository }],
    }).compile();

    service = module.get<AccountLinkageService>(AccountLinkageService);
    jest.clearAllMocks();
    arrange();
  });

  describe('assess', () => {
    it('finds nothing for an account tied to no one', async () => {
      await expect(service.assess('user-1')).resolves.toEqual({ points: 0, holdRecommended: false, accounts: [] });
    });

    it('asks each lookup about this user only, excluding themselves and capping the list', async () => {
      await service.assess('user-1');

      const scope = { excludeUserId: 'user-1', limit: LINKED_ACCOUNTS_LIMIT };
      expect(mockRepository.usersSharingPan).toHaveBeenCalledWith([], scope);
      expect(mockRepository.usersSharingBankAccounts).toHaveBeenCalledWith([], scope);
      expect(mockRepository.usersSharingInstallIds).toHaveBeenCalledWith([], scope);
    });

    describe('scoring', () => {
      it('treats a shared PAN as reason enough to hold a payout: it identifies one person', async () => {
        arrange({ pan: ['u2'] });

        const result = await service.assess('user-1');

        expect(result.points).toBe(60);
        expect(result.holdRecommended).toBe(true);
        expect(result.accounts).toEqual([{ userId: 'u2', name: 'First-u2 Person', status: 'ACTIVE', kinds: ['PAN'] }]);
      });

      it('treats a shared bank account as reason enough, exactly at the hold threshold', async () => {
        arrange({ bank: ['u2'] });

        const result = await service.assess('user-1');

        expect(result.points).toBe(LINK_HOLD_POINTS);
        expect(result.holdRecommended).toBe(true);
      });

      it('does not hold for a single shared device: families share phones', async () => {
        arrange({ device: ['u2'] });

        const result = await service.assess('user-1');

        expect(result.points).toBe(25);
        expect(result.holdRecommended).toBe(false);
      });

      it('holds when two or more other accounts share the device: that is a device farm', async () => {
        arrange({ device: ['u2', 'u3'] });

        const result = await service.assess('user-1');

        expect(result.points).toBe(50);
        expect(result.holdRecommended).toBe(true);
      });

      it('stops adding device points at the cap, so one signal cannot dominate', async () => {
        arrange({ device: ['u2', 'u3', 'u4', 'u5', 'u6'] });

        expect((await service.assess('user-1')).points).toBe(60);
      });

      it('never holds on a shared IP alone, however many accounts share it', async () => {
        arrange({ ips: { '203.0.113.9': ['user-1', 'u2', 'u3', 'u4', 'u5', 'u6'] } });

        const result = await service.assess('user-1');

        expect(result.points).toBe(16); // capped
        expect(result.holdRecommended).toBe(false);
      });

      it('adds the kinds together', async () => {
        arrange({ pan: ['u2'], device: ['u3'], ips: { '203.0.113.9': ['user-1', 'u4'] } });

        expect((await service.assess('user-1')).points).toBe(60 + 25 + 8);
      });
    });

    describe('the accounts listed', () => {
      it('merges the kinds when one account is linked in several ways', async () => {
        arrange({ pan: ['u2'], bank: ['u2'], device: ['u2'] });

        const { accounts } = await service.assess('user-1');

        expect(accounts).toHaveLength(1);
        expect(accounts[0].kinds).toEqual(['PAN', 'BANK_ACCOUNT', 'DEVICE']);
      });

      it('puts the most worrying account first', async () => {
        arrange({ device: ['weak-device'], pan: ['strong-pan'], ips: { '203.0.113.9': ['user-1', 'weakest-ip'] } });

        const { accounts } = await service.assess('user-1');

        expect(accounts.map((a) => a.userId)).toEqual(['strong-pan', 'weak-device', 'weakest-ip']);
      });

      it('joins first and last names and includes the account status', async () => {
        arrange({ pan: ['u2'] });
        mockRepository.userSummaries.mockResolvedValue([{ id: 'u2', firstName: 'Priya', lastName: 'Sharma', status: 'SUSPENDED' }]);

        const { accounts } = await service.assess('user-1');

        expect(accounts[0]).toEqual(expect.objectContaining({ name: 'Priya Sharma', status: 'SUSPENDED' }));
      });
    });

    describe('shared IP addresses', () => {
      it('looks at recent successful logins only, and never counts the user as their own neighbour', async () => {
        arrange({ ips: { '203.0.113.9': ['user-1', 'u2'] } });

        const { accounts } = await service.assess('user-1');

        expect(accounts.map((a) => a.userId)).toEqual(['u2']);
        const [, since] = mockRepository.recentIpsOf.mock.calls[0];
        expect(Math.abs(Date.now() - since.getTime() - IP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)).toBeLessThan(5_000);
      });

      it('ignores an address used by many accounts: that is an office, a campus, a mobile carrier, or a proxy we are misreading', async () => {
        const crowd = ['user-1', ...Array.from({ length: IP_MAX_SHARING_ACCOUNTS }, (_, i) => `crowd-${i}`)];
        expect(crowd.length).toBeGreaterThan(IP_MAX_SHARING_ACCOUNTS);
        arrange({ ips: { '203.0.113.9': crowd } });

        const result = await service.assess('user-1');

        expect(result.accounts).toEqual([]);
        expect(result.points).toBe(0);
      });

      it('still counts an address shared by exactly the maximum number of accounts', async () => {
        const group = ['user-1', ...Array.from({ length: IP_MAX_SHARING_ACCOUNTS - 1 }, (_, i) => `group-${i}`)];
        arrange({ ips: { '203.0.113.9': group } });

        expect((await service.assess('user-1')).accounts).toHaveLength(IP_MAX_SHARING_ACCOUNTS - 1);
      });

      it('lists an account only once when it shares several of the addresses', async () => {
        arrange({ ips: { '203.0.113.9': ['user-1', 'u2'], '198.51.100.4': ['user-1', 'u2'] } });

        const { accounts, points } = await service.assess('user-1');

        expect(accounts).toHaveLength(1);
        expect(points).toBe(8);
      });
    });
  });

  describe('areLinked', () => {
    it('is true for a user and themselves', async () => {
      await expect(service.areLinked('user-1', 'user-1')).resolves.toBe(true);
      expect(mockRepository.usersSharingPan).not.toHaveBeenCalled();
    });

    it('asks only about the one other user', async () => {
      await service.areLinked('user-1', 'user-2');

      expect(mockRepository.usersSharingPan).toHaveBeenCalledWith([], { excludeUserId: 'user-1', onlyUserId: 'user-2', limit: 1 });
    });

    it.each([['PAN', { pan: ['user-2'] }], ['bank account', { bank: ['user-2'] }], ['device', { device: ['user-2'] }]])(
      'is true when they share a %s',
      async (_label, links) => {
        arrange(links);

        await expect(service.areLinked('user-1', 'user-2')).resolves.toBe(true);
      },
    );

    it('is false when nothing ties them', async () => {
      await expect(service.areLinked('user-1', 'user-2')).resolves.toBe(false);
    });

    it('does not count a shared IP, since friends and family share Wi-Fi', async () => {
      arrange({ ips: { '203.0.113.9': ['user-1', 'user-2'] } });

      await expect(service.areLinked('user-1', 'user-2')).resolves.toBe(false);
      expect(mockRepository.accountsByIp).not.toHaveBeenCalled();
    });
  });
});
