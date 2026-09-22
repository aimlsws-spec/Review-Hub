import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AccountLinkageRepository } from '../repositories';

import { AccountLinkageService } from './account-linkage.service';
import { AccountRiskService, riskLevelForScore } from './account-risk.service';
import { IpReputationService } from './ip-reputation.service';

describe('riskLevelForScore', () => {
  it.each([
    [0, 'LOW'],
    [29, 'LOW'],
    [30, 'MEDIUM'],
    [59, 'MEDIUM'],
    [60, 'HIGH'],
    [79, 'HIGH'],
    [80, 'CRITICAL'],
    [100, 'CRITICAL'],
  ])('maps %i to %s', (score, level) => expect(riskLevelForScore(score)).toBe(level));
});

describe('AccountRiskService', () => {
  let service: AccountRiskService;

  const mockRepository = { userSummaries: jest.fn(), maxDeviceRisk: jest.fn(), recentIpsOf: jest.fn() };
  const mockLinkage = { assess: jest.fn() };
  const mockIpReputation = { assess: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRiskService,
        { provide: AccountLinkageRepository, useValue: mockRepository },
        { provide: AccountLinkageService, useValue: mockLinkage },
        { provide: IpReputationService, useValue: mockIpReputation },
      ],
    }).compile();

    service = module.get<AccountRiskService>(AccountRiskService);
    jest.clearAllMocks();
    mockRepository.userSummaries.mockResolvedValue([{ id: 'user-1', firstName: 'A', lastName: 'B', status: 'ACTIVE' }]);
    mockRepository.maxDeviceRisk.mockResolvedValue(0);
    mockRepository.recentIpsOf.mockResolvedValue([]);
    mockLinkage.assess.mockResolvedValue({ points: 0, holdRecommended: false, accounts: [] });
  });

  it('reports a clean account as LOW with nothing to show', async () => {
    await expect(service.assess('user-1')).resolves.toEqual({
      score: 0,
      level: 'LOW',
      deviceRisk: 0,
      linkPoints: 0,
      linkedAccounts: [],
      recentIps: [],
    });
  });

  it('adds the worst device risk to the points from linked accounts', async () => {
    mockRepository.maxDeviceRisk.mockResolvedValue(40);
    mockLinkage.assess.mockResolvedValue({ points: 25, holdRecommended: false, accounts: [] });

    const report = await service.assess('user-1');

    expect(report).toEqual(expect.objectContaining({ score: 65, level: 'HIGH', deviceRisk: 40, linkPoints: 25 }));
  });

  it('caps the score at 100', async () => {
    mockRepository.maxDeviceRisk.mockResolvedValue(80);
    mockLinkage.assess.mockResolvedValue({ points: 110, holdRecommended: true, accounts: [] });

    const report = await service.assess('user-1');

    expect(report.score).toBe(100);
    expect(report.level).toBe('CRITICAL');
  });

  it('lists the linked accounts for a reviewer to follow up', async () => {
    const accounts = [{ userId: 'u2', name: 'Other Person', status: 'ACTIVE', kinds: ['PAN'] }];
    mockLinkage.assess.mockResolvedValue({ points: 60, holdRecommended: true, accounts });

    expect((await service.assess('user-1')).linkedAccounts).toEqual(accounts);
  });

  it('shows the reputation verdict for each recent IP address', async () => {
    mockRepository.recentIpsOf.mockResolvedValue(['203.0.113.9', '198.51.100.4']);
    mockIpReputation.assess.mockImplementation((ip: string) =>
      ip === '203.0.113.9' ? { verdict: 'ANONYMIZER', sources: ['vpn'] } : { verdict: 'CLEAN', sources: [] },
    );

    const { recentIps } = await service.assess('user-1');

    expect(recentIps).toEqual([
      { ip: '203.0.113.9', verdict: 'ANONYMIZER', sources: ['vpn'] },
      { ip: '198.51.100.4', verdict: 'CLEAN', sources: [] },
    ]);
  });

  it('looks back 30 days and shows at most 10 addresses', async () => {
    await service.assess('user-1');

    const [, since, limit] = mockRepository.recentIpsOf.mock.calls[0];
    expect(limit).toBe(10);
    expect(Math.abs(Date.now() - since.getTime() - 30 * 24 * 60 * 60 * 1000)).toBeLessThan(5_000);
  });

  it('throws NotFoundException for an unknown user rather than returning an empty, reassuring report', async () => {
    mockRepository.userSummaries.mockResolvedValue([]);

    await expect(service.assess('missing')).rejects.toThrow(NotFoundException);
    expect(mockLinkage.assess).not.toHaveBeenCalled();
  });
});
