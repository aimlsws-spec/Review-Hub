import { Test, TestingModule } from '@nestjs/testing';

import { CampaignService } from '../services';

import { PublicCampaignController } from './public-campaign.controller';

describe('PublicCampaignController', () => {
  let controller: PublicCampaignController;

  const mockCampaignService = {
    listPublic: jest.fn(),
    getPublicById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCampaignController],
      providers: [{ provide: CampaignService, useValue: mockCampaignService }],
    }).compile();

    controller = module.get<PublicCampaignController>(PublicCampaignController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('browse', () => {
    it('should call campaignService.listPublic', async () => {
      const query = { page: 1, limit: 20 };
      await controller.browse(query as never);
      expect(mockCampaignService.listPublic).toHaveBeenCalledWith(query);
    });
  });

  describe('details', () => {
    it('should call campaignService.getPublicById', async () => {
      mockCampaignService.getPublicById.mockResolvedValue({ id: 'campaign-1' });

      await expect(controller.details('campaign-1')).resolves.toEqual({ id: 'campaign-1' });

      expect(mockCampaignService.getPublicById).toHaveBeenCalledWith('campaign-1');
    });
  });
});
