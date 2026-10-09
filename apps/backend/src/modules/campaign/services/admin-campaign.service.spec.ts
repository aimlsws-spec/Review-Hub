import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AdminCampaignService } from './admin-campaign.service';

describe('AdminCampaignService', () => {
  const performanceOf = (campaignId: string, completions: number) => ({
    campaignId,
    joins: completions + 2,
    finished: completions,
    completionRate: 0.5,
    completions,
    rewardsPaid: completions * 40,
  });

  const campaignRepository = { findForAdmin: jest.fn() };
  const campaignService = { getAdminDetail: jest.fn() };
  const performanceService = { forCampaigns: jest.fn() };
  const service = new AdminCampaignService(campaignRepository as never, campaignService as never, performanceService as never);

  beforeEach(() => jest.resetAllMocks());

  describe('list', () => {
    it('passes the filters on and adds how each campaign is doing', async () => {
      campaignRepository.findForAdmin.mockResolvedValueOnce({
        data: [{ id: 'campaign-1' }, { id: 'campaign-2' }],
        total: 2,
        page: 1,
        limit: 20,
        statusCounts: { ACTIVE: 2 },
      });
      performanceService.forCampaigns.mockResolvedValueOnce(
        new Map([
          ['campaign-1', performanceOf('campaign-1', 5)],
          ['campaign-2', performanceOf('campaign-2', 0)],
        ]),
      );

      const result = await service.list({ page: 1, limit: 20, status: 'ACTIVE', merchantId: 'merchant-1', search: 'cake' } as never);

      expect(campaignRepository.findForAdmin).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: 'ACTIVE',
        campaignType: undefined,
        merchantId: 'merchant-1',
        search: 'cake',
      });
      expect(performanceService.forCampaigns).toHaveBeenCalledWith(['campaign-1', 'campaign-2']);
      expect(result.statusCounts).toEqual({ ACTIVE: 2 });
      expect(result.data[0].performance).toMatchObject({ completions: 5, rewardsPaid: 200 });
      expect(result.data[1].performance).toMatchObject({ completions: 0 });
    });

    it('treats an empty search as no search', async () => {
      campaignRepository.findForAdmin.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 20, statusCounts: {} });
      performanceService.forCampaigns.mockResolvedValueOnce(new Map());

      await service.list({ page: 1, limit: 20, search: '' } as never);

      expect(campaignRepository.findForAdmin).toHaveBeenCalledWith(expect.objectContaining({ search: undefined }));
    });
  });

  describe('getDetail', () => {
    it('returns the full campaign with its performance', async () => {
      campaignService.getAdminDetail.mockResolvedValueOnce({ id: 'campaign-1', title: 'Cake week', policyFlags: [] });
      performanceService.forCampaigns.mockResolvedValueOnce(new Map([['campaign-1', performanceOf('campaign-1', 3)]]));

      const result = await service.getDetail('campaign-1');

      expect(result).toMatchObject({ id: 'campaign-1', title: 'Cake week', performance: { completions: 3, rewardsPaid: 120 } });
    });

    it('passes on a missing campaign', async () => {
      campaignService.getAdminDetail.mockRejectedValueOnce(new NotFoundException('Campaign'));

      await expect(service.getDetail('missing')).rejects.toThrow(NotFoundException);
      expect(performanceService.forCampaigns).not.toHaveBeenCalled();
    });
  });
});
