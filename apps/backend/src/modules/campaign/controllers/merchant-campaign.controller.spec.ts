import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { CampaignBuilderService, CampaignPolicyService, CampaignService, MerchantAnalyticsService, MerchantInsightsService } from '../services';

import { MerchantCampaignController } from './merchant-campaign.controller';

describe('MerchantCampaignController', () => {
  let controller: MerchantCampaignController;

  const mockCampaignService = {
    create: jest.fn(),
    listByMerchant: jest.fn(),
  };

  const mockCampaignBuilderService = { recommend: jest.fn() };
  const mockInsightsService = { getInsights: jest.fn() };
  const mockPolicyService = { check: jest.fn() };
  const mockAnalyticsService = { overview: jest.fn(), forCampaign: jest.fn() };

  const mockMerchantRepository = {};
  const mockTeamRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantCampaignController],
      providers: [
        { provide: CampaignService, useValue: mockCampaignService },
        { provide: CampaignBuilderService, useValue: mockCampaignBuilderService },
        { provide: MerchantInsightsService, useValue: mockInsightsService },
        { provide: CampaignPolicyService, useValue: mockPolicyService },
        { provide: MerchantAnalyticsService, useValue: mockAnalyticsService },
        MerchantOwnershipGuard,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantTeamRepository, useValue: mockTeamRepository },
      ],
    }).compile();

    controller = module.get<MerchantCampaignController>(MerchantCampaignController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call campaignService.create', async () => {
      const dto = { title: 'Try our menu' };
      await controller.create('merchant-1', 'user-1', dto as never);
      expect(mockCampaignService.create).toHaveBeenCalledWith('merchant-1', 'user-1', dto);
    });
  });

  describe('recommend', () => {
    it('should call campaignBuilderService.recommend with the merchant and dto', async () => {
      const dto = { goal: 'MORE_REVIEWS', budget: 5000 };
      await controller.recommend('merchant-1', dto as never);
      expect(mockCampaignBuilderService.recommend).toHaveBeenCalledWith('merchant-1', dto);
    });

    it('is rate limited', () => {
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', MerchantCampaignController.prototype.recommend)).toBe(30);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', MerchantCampaignController.prototype.recommend)).toBe(60_000);
    });
  });

  describe('checkWording', () => {
    it('checks the campaign text and every task, naming each field, and stores nothing', () => {
      mockPolicyService.check.mockReturnValue({ allowed: true, findings: [] });

      const result = controller.checkWording({
        title: 'A title',
        description: 'A description',
        tasks: [{ title: 'Review us', instructions: 'Be honest' }, { description: 'No title here' }],
      });

      expect(result).toEqual({ allowed: true, findings: [] });
      const inputs = mockPolicyService.check.mock.calls[0][0] as { field: string; text?: string }[];
      expect(inputs).toContainEqual({ field: 'title', text: 'A title' });
      expect(inputs).toContainEqual({ field: 'task "Review us" instructions', text: 'Be honest' });
      expect(inputs).toContainEqual({ field: 'task 2 description', text: 'No title here' });
      expect(mockCampaignService.create).not.toHaveBeenCalled();
    });

    it('accepts a request with nothing in it', () => {
      mockPolicyService.check.mockReturnValue({ allowed: true, findings: [] });
      expect(() => controller.checkWording({})).not.toThrow();
    });

    it('is rate limited', () => {
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', MerchantCampaignController.prototype.checkWording)).toBe(60);
    });
  });

  describe('analytics', () => {
    it('gives the merchant an overview for the period asked for', async () => {
      await controller.overview('merchant-1', { days: 90 });
      expect(mockAnalyticsService.overview).toHaveBeenCalledWith('merchant-1', 90);
    });

    it('asks for one campaign as this merchant, so it can not be someone else’s', async () => {
      await controller.analytics('merchant-1', 'campaign-1');
      expect(mockAnalyticsService.forCampaign).toHaveBeenCalledWith('campaign-1', 'merchant-1');
    });
  });

  describe('insights', () => {
    it('should call insightsService.getInsights for the merchant', async () => {
      await controller.insights('merchant-1');
      expect(mockInsightsService.getInsights).toHaveBeenCalledWith('merchant-1');
    });
  });

  describe('list', () => {
    it('should call campaignService.listByMerchant', async () => {
      const query = { page: 1, limit: 20 };
      await controller.list('merchant-1', query as never);
      expect(mockCampaignService.listByMerchant).toHaveBeenCalledWith('merchant-1', query);
    });
  });
});
