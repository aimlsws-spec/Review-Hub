import { Test, TestingModule } from '@nestjs/testing';

import { CampaignOwnershipGuard } from '../../campaign/guards';
import { CampaignRepository } from '../../campaign/repositories';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { CampaignTaskService } from '../services';

import { MerchantCampaignTaskController } from './merchant-campaign-task.controller';

describe('MerchantCampaignTaskController', () => {
  let controller: MerchantCampaignTaskController;

  const mockCampaignTaskService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantCampaignTaskController],
      providers: [
        { provide: CampaignTaskService, useValue: mockCampaignTaskService },
        CampaignOwnershipGuard,
        { provide: CampaignRepository, useValue: {} },
        { provide: MerchantRepository, useValue: {} },
        { provide: MerchantTeamRepository, useValue: {} },
      ],
    }).compile();

    controller = module.get<MerchantCampaignTaskController>(MerchantCampaignTaskController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call campaignTaskService.create', async () => {
      const dto = { title: 'Follow us' };
      await controller.create('campaign-1', dto as never);
      expect(mockCampaignTaskService.create).toHaveBeenCalledWith('campaign-1', dto);
    });
  });

  describe('update', () => {
    it('should call campaignTaskService.update', async () => {
      const dto = { title: 'Updated' };
      await controller.update('campaign-1', 'task-1', dto as never);
      expect(mockCampaignTaskService.update).toHaveBeenCalledWith('campaign-1', 'task-1', dto);
    });
  });

  describe('remove', () => {
    it('should call campaignTaskService.remove', async () => {
      await controller.remove('campaign-1', 'task-1');
      expect(mockCampaignTaskService.remove).toHaveBeenCalledWith('campaign-1', 'task-1');
    });
  });
});
