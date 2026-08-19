import { Test, TestingModule } from '@nestjs/testing';

import { CampaignTaskService } from '../services';

import { CampaignTaskController } from './campaign-task.controller';

describe('CampaignTaskController', () => {
  let controller: CampaignTaskController;

  const mockCampaignTaskService = { listPublic: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignTaskController],
      providers: [{ provide: CampaignTaskService, useValue: mockCampaignTaskService }],
    }).compile();

    controller = module.get<CampaignTaskController>(CampaignTaskController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should call campaignTaskService.listPublic', async () => {
      await controller.list('campaign-1');
      expect(mockCampaignTaskService.listPublic).toHaveBeenCalledWith('campaign-1');
    });
  });
});
