import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { AccountLinkageRepository } from './account-linkage.repository';

describe('AccountLinkageRepository', () => {
  let repository: AccountLinkageRepository;

  const mockPrisma = {
    device: { findMany: jest.fn(), aggregate: jest.fn() },
    userBankAccount: { findMany: jest.fn() },
    userKycDocument: { findMany: jest.fn() },
    loginHistory: { findMany: jest.fn(), groupBy: jest.fn() },
    user: { findMany: jest.fn() },
    campaignParticipant: { findMany: jest.fn() },
  };
  const scope = { excludeUserId: 'user-1', limit: 25 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountLinkageRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<AccountLinkageRepository>(AccountLinkageRepository);
    jest.clearAllMocks();
  });

  describe('devices', () => {
    it("lists this user's distinct install ids, ignoring devices that never sent one", async () => {
      mockPrisma.device.findMany.mockResolvedValue([{ installId: 'a' }, { installId: 'b' }]);

      await expect(repository.installIdsOf('user-1')).resolves.toEqual(['a', 'b']);
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', installId: { not: null } },
        distinct: ['installId'],
        select: { installId: true },
      });
    });

    it('finds other users on the same install, one row per user and capped', async () => {
      mockPrisma.device.findMany.mockResolvedValue([{ userId: 'u2' }]);

      await expect(repository.usersSharingInstallIds(['a'], scope)).resolves.toEqual(['u2']);
      expect(mockPrisma.device.findMany).toHaveBeenCalledWith({
        where: { installId: { in: ['a'] }, userId: { not: 'user-1' } },
        distinct: ['userId'],
        select: { userId: true },
        take: 25,
      });
    });

    it('skips the query entirely when the user has no install ids', async () => {
      await expect(repository.usersSharingInstallIds([], scope)).resolves.toEqual([]);
      expect(mockPrisma.device.findMany).not.toHaveBeenCalled();
    });

    it('narrows to one specific other user for a yes/no question about two accounts', async () => {
      mockPrisma.device.findMany.mockResolvedValue([]);

      await repository.usersSharingInstallIds(['a'], { excludeUserId: 'user-1', onlyUserId: 'user-2', limit: 1 });

      expect(mockPrisma.device.findMany.mock.calls[0][0].where).toEqual({ installId: { in: ['a'] }, userId: 'user-2' });
    });

    it("reports the worst risk score across active devices, or 0 when there are none", async () => {
      mockPrisma.device.aggregate.mockResolvedValueOnce({ _max: { riskScore: 60 } }).mockResolvedValueOnce({ _max: { riskScore: null } });

      await expect(repository.maxDeviceRisk('user-1')).resolves.toBe(60);
      await expect(repository.maxDeviceRisk('user-1')).resolves.toBe(0);
      expect(mockPrisma.device.aggregate).toHaveBeenCalledWith({ where: { userId: 'user-1', isActive: true }, _max: { riskScore: true } });
    });
  });

  describe('bank accounts', () => {
    it("reads the user's live accounts as number + IFSC pairs", async () => {
      mockPrisma.userBankAccount.findMany.mockResolvedValue([{ accountNumber: '111', ifscCode: 'HDFC0001' }]);

      await expect(repository.bankKeysOf('user-1')).resolves.toEqual([{ accountNumber: '111', ifscCode: 'HDFC0001' }]);
      expect(mockPrisma.userBankAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        select: { accountNumber: true, ifscCode: true },
      });
    });

    it('matches on number AND IFSC together, since an account number alone is not unique across banks', async () => {
      mockPrisma.userBankAccount.findMany.mockResolvedValue([{ userId: 'u2' }]);

      await expect(repository.usersSharingBankAccounts([{ accountNumber: '111', ifscCode: 'HDFC0001' }, { accountNumber: '222', ifscCode: 'ICIC0002' }], scope)).resolves.toEqual(['u2']);

      expect(mockPrisma.userBankAccount.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
        userId: { not: 'user-1' },
        OR: [
          { accountNumber: '111', ifscCode: 'HDFC0001' },
          { accountNumber: '222', ifscCode: 'ICIC0002' },
        ],
      });
    });

    it('skips the query when the user has no accounts', async () => {
      await expect(repository.usersSharingBankAccounts([], scope)).resolves.toEqual([]);
      expect(mockPrisma.userBankAccount.findMany).not.toHaveBeenCalled();
    });
  });

  describe('PAN numbers', () => {
    it('reads the live PAN numbers, upper-cased and trimmed so the same PAN typed differently still matches', async () => {
      mockPrisma.userKycDocument.findMany.mockResolvedValue([{ documentNumber: ' abcde1234f ' }, { documentNumber: 'PQRST5678U' }]);

      await expect(repository.panNumbersOf('user-1')).resolves.toEqual(['ABCDE1234F', 'PQRST5678U']);
      expect(mockPrisma.userKycDocument.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', documentType: 'PAN', deletedAt: null, documentNumber: { not: null } },
        select: { documentNumber: true },
      });
    });

    it('finds other users holding the same PAN', async () => {
      mockPrisma.userKycDocument.findMany.mockResolvedValue([{ userId: 'u2' }]);

      await expect(repository.usersSharingPan(['ABCDE1234F'], scope)).resolves.toEqual(['u2']);
      expect(mockPrisma.userKycDocument.findMany.mock.calls[0][0].where).toEqual({
        documentType: 'PAN',
        deletedAt: null,
        documentNumber: { in: ['ABCDE1234F'] },
        userId: { not: 'user-1' },
      });
    });

    it('skips the query when there is no PAN', async () => {
      await expect(repository.usersSharingPan([], scope)).resolves.toEqual([]);
      expect(mockPrisma.userKycDocument.findMany).not.toHaveBeenCalled();
    });
  });

  describe('IP addresses', () => {
    const since = new Date('2026-08-20T00:00:00Z');

    it('lists distinct addresses from recent successful logins, newest first', async () => {
      mockPrisma.loginHistory.findMany.mockResolvedValue([{ ipAddress: '203.0.113.9' }, { ipAddress: '198.51.100.4' }]);

      await expect(repository.recentIpsOf('user-1', since, 20)).resolves.toEqual(['203.0.113.9', '198.51.100.4']);
      expect(mockPrisma.loginHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isSuccess: true, ipAddress: { not: null }, loginAt: { gte: since } },
        orderBy: { loginAt: 'desc' },
        distinct: ['ipAddress'],
        select: { ipAddress: true },
        take: 20,
      });
    });

    it('groups the accounts that used each address recently, counting successful logins only', async () => {
      mockPrisma.loginHistory.groupBy.mockResolvedValue([
        { ipAddress: '203.0.113.9', userId: 'user-1' },
        { ipAddress: '203.0.113.9', userId: 'u2' },
        { ipAddress: '198.51.100.4', userId: 'user-1' },
      ]);

      const byIp = await repository.accountsByIp(['203.0.113.9', '198.51.100.4'], since);

      expect(byIp.get('203.0.113.9')).toEqual(['user-1', 'u2']);
      expect(byIp.get('198.51.100.4')).toEqual(['user-1']);
      expect(mockPrisma.loginHistory.groupBy).toHaveBeenCalledWith({
        by: ['ipAddress', 'userId'],
        where: { ipAddress: { in: ['203.0.113.9', '198.51.100.4'] }, isSuccess: true, loginAt: { gte: since } },
      });
    });

    it('skips the query when there are no addresses', async () => {
      await expect(repository.accountsByIp([], since)).resolves.toEqual(new Map());
      expect(mockPrisma.loginHistory.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('supporting lookups', () => {
    it('reads only the safe user fields for the accounts listed', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await repository.userSummaries(['u2']);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['u2'] } },
        select: { id: true, firstName: true, lastName: true, status: true },
      });
    });

    it('skips the query for no ids', async () => {
      await expect(repository.userSummaries([])).resolves.toEqual([]);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('finds which of these users joined a campaign', async () => {
      mockPrisma.campaignParticipant.findMany.mockResolvedValue([{ userId: 'u2' }]);

      await expect(repository.participantsInCampaign('campaign-1', ['u2', 'u3'])).resolves.toEqual(['u2']);
      expect(mockPrisma.campaignParticipant.findMany).toHaveBeenCalledWith({
        where: { campaignId: 'campaign-1', userId: { in: ['u2', 'u3'] } },
        select: { userId: true },
      });
    });

    it('skips the query for no users', async () => {
      await expect(repository.participantsInCampaign('campaign-1', [])).resolves.toEqual([]);
      expect(mockPrisma.campaignParticipant.findMany).not.toHaveBeenCalled();
    });
  });
});
