import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { CampaignService } from '../services';

import { MerchantCampaignController } from './merchant-campaign.controller';

describe('MerchantCampaignController', () => {
  let controller: MerchantCampaignController;

  const mockCampaignService = {
    create: jest.fn(),
    listByMerchant: jest.fn(),
  };

  const mockMerchantRepository = {};
  const mockTeamRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantCampaignController],
      providers: [
        { provide: CampaignService, useValue: mockCampaignService },
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

  describe('list', () => {
    it('should call campaignService.listByMerchant', async () => {
      const query = { page: 1, limit: 20 };
      await controller.list('merchant-1', query as never);
      expect(mockCampaignService.listByMerchant).toHaveBeenCalledWith('merchant-1', query);
    });
  });
});
