import { Test, TestingModule } from '@nestjs/testing';

import { AccountLinkageRepository, SubmissionSignalRepository } from '../repositories';

import { AccountLinkageService } from './account-linkage.service';
import { IpReputationService } from './ip-reputation.service';
import { SubmissionRiskService } from './submission-risk.service';

describe('SubmissionRiskService', () => {
  let service: SubmissionRiskService;

  const mockIpReputation = { assess: jest.fn() };
  const mockLinkage = { assess: jest.fn() };
  const mockRepository = { participantsInCampaign: jest.fn() };
  const mockSignals = { createFlag: jest.fn() };

  const params = { submissionId: 'sub-1', userId: 'user-1', campaignId: 'campaign-1', ip: '203.0.113.9' };
  const account = (userId: string, kinds: string[]) => ({ userId, name: userId, status: 'ACTIVE', kinds });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionRiskService,
        { provide: IpReputationService, useValue: mockIpReputation },
        { provide: AccountLinkageService, useValue: mockLinkage },
        { provide: AccountLinkageRepository, useValue: mockRepository },
        { provide: SubmissionSignalRepository, useValue: mockSignals },
      ],
    }).compile();

    service = module.get<SubmissionRiskService>(SubmissionRiskService);
    jest.clearAllMocks();
    mockIpReputation.assess.mockReturnValue({ verdict: 'CLEAN', sources: [] });
    mockLinkage.assess.mockResolvedValue({ points: 0, holdRecommended: false, accounts: [] });
    mockRepository.participantsInCampaign.mockResolvedValue([]);
  });

  it('raises nothing for an ordinary submission', async () => {
    await service.assess(params);

    expect(mockSignals.createFlag).not.toHaveBeenCalled();
  });

  describe('the network it came from', () => {
    it('notes a VPN, proxy or datacenter address as a MEDIUM flag, naming the lists that matched', async () => {
      mockIpReputation.assess.mockReturnValue({ verdict: 'ANONYMIZER', sources: ['vpn', 'watch-list'] });

      await service.assess(params);

      expect(mockIpReputation.assess).toHaveBeenCalledWith('203.0.113.9');
      expect(mockSignals.createFlag).toHaveBeenCalledWith({
        submissionId: 'sub-1',
        userId: 'user-1',
        type: 'VPN_DETECTED',
        riskLevel: 'MEDIUM',
        reason: expect.stringContaining('vpn, watch-list'),
        metadata: { ip: '203.0.113.9', sources: ['vpn', 'watch-list'] },
      });
    });

    it('never makes it more than MEDIUM, so it cannot hold a reward: plenty of honest people use a VPN', async () => {
      mockIpReputation.assess.mockReturnValue({ verdict: 'ANONYMIZER', sources: ['vpn'] });

      await service.assess(params);

      expect(mockSignals.createFlag.mock.calls[0][0].riskLevel).toBe('MEDIUM');
    });

    it.each(['CLEAN', 'PRIVATE', 'UNKNOWN'])('raises nothing for a %s address', async (verdict) => {
      mockIpReputation.assess.mockReturnValue({ verdict, sources: [] });

      await service.assess(params);

      expect(mockSignals.createFlag).not.toHaveBeenCalled();
    });

    it('copes with no IP at all', async () => {
      await service.assess({ ...params, ip: undefined });

      expect(mockIpReputation.assess).toHaveBeenCalledWith(undefined);
      expect(mockSignals.createFlag).not.toHaveBeenCalled();
    });
  });

  describe('several accounts working the same campaign', () => {
    it('raises a HIGH flag when an account sharing a PAN or bank account is in the same campaign', async () => {
      mockLinkage.assess.mockResolvedValue({ points: 60, holdRecommended: true, accounts: [account('u2', ['PAN'])] });
      mockRepository.participantsInCampaign.mockResolvedValue(['u2']);

      await service.assess(params);

      expect(mockRepository.participantsInCampaign).toHaveBeenCalledWith('campaign-1', ['u2']);
      expect(mockSignals.createFlag).toHaveBeenCalledWith({
        submissionId: 'sub-1',
        userId: 'user-1',
        type: 'MULTIPLE_ACCOUNTS',
        riskLevel: 'HIGH',
        reason: expect.stringMatching(/PAN or bank account/),
        metadata: { linkedUserIds: ['u2'], linkKinds: ['PAN'] },
      });
    });

    it('raises only MEDIUM when the only tie is a shared device, since families share phones', async () => {
      mockLinkage.assess.mockResolvedValue({ points: 25, holdRecommended: false, accounts: [account('u2', ['DEVICE'])] });
      mockRepository.participantsInCampaign.mockResolvedValue(['u2']);

      await service.assess(params);

      expect(mockSignals.createFlag.mock.calls[0][0]).toEqual(expect.objectContaining({ type: 'MULTIPLE_ACCOUNTS', riskLevel: 'MEDIUM' }));
    });

    it('is HIGH as soon as any of the linked accounts in the campaign is tied by identity', async () => {
      mockLinkage.assess.mockResolvedValue({
        points: 85,
        holdRecommended: true,
        accounts: [account('u2', ['DEVICE']), account('u3', ['BANK_ACCOUNT'])],
      });
      mockRepository.participantsInCampaign.mockResolvedValue(['u2', 'u3']);

      await service.assess(params);

      expect(mockSignals.createFlag.mock.calls[0][0].riskLevel).toBe('HIGH');
      expect(mockSignals.createFlag.mock.calls[0][0].metadata.linkedUserIds.sort()).toEqual(['u2', 'u3']);
    });

    it('flags only the linked accounts that actually joined this campaign', async () => {
      mockLinkage.assess.mockResolvedValue({
        points: 110,
        holdRecommended: true,
        accounts: [account('joined', ['PAN']), account('not-joined', ['PAN'])],
      });
      mockRepository.participantsInCampaign.mockResolvedValue(['joined']);

      await service.assess(params);

      expect(mockSignals.createFlag.mock.calls[0][0].metadata.linkedUserIds).toEqual(['joined']);
    });

    it('raises nothing when the linked accounts have not joined this campaign', async () => {
      mockLinkage.assess.mockResolvedValue({ points: 60, holdRecommended: true, accounts: [account('u2', ['PAN'])] });
      mockRepository.participantsInCampaign.mockResolvedValue([]);

      await service.assess(params);

      expect(mockSignals.createFlag).not.toHaveBeenCalled();
    });

    it('ignores accounts that only share an IP address', async () => {
      mockLinkage.assess.mockResolvedValue({ points: 8, holdRecommended: false, accounts: [account('u2', ['IP'])] });

      await service.assess(params);

      expect(mockRepository.participantsInCampaign).not.toHaveBeenCalled();
      expect(mockSignals.createFlag).not.toHaveBeenCalled();
    });

    it('does not even look at campaign membership when the user has no strong links', async () => {
      await service.assess(params);

      expect(mockRepository.participantsInCampaign).not.toHaveBeenCalled();
    });
  });

  it('can raise both kinds of flag for one submission', async () => {
    mockIpReputation.assess.mockReturnValue({ verdict: 'ANONYMIZER', sources: ['vpn'] });
    mockLinkage.assess.mockResolvedValue({ points: 60, holdRecommended: true, accounts: [account('u2', ['PAN'])] });
    mockRepository.participantsInCampaign.mockResolvedValue(['u2']);

    await service.assess(params);

    expect(mockSignals.createFlag.mock.calls.map((call) => call[0].type)).toEqual(['VPN_DETECTED', 'MULTIPLE_ACCOUNTS']);
  });

  it('lets a lookup failure propagate; the caller decides submissions must not be blocked by it', async () => {
    mockLinkage.assess.mockRejectedValue(new Error('database unavailable'));

    await expect(service.assess(params)).rejects.toThrow('database unavailable');
  });
});
