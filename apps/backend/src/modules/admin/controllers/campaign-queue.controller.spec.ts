import { Test, TestingModule } from '@nestjs/testing';

import { CampaignService } from '../../campaign/services';

import { AdminCampaignQueueController } from './campaign-queue.controller';

describe('AdminCampaignQueueController', () => {
  let controller: AdminCampaignQueueController;

  const mockCampaignService = {
    listPendingReview: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    requestChanges: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCampaignQueueController],
      providers: [{ provide: CampaignService, useValue: mockCampaignService }],
    }).compile();

    controller = module.get<AdminCampaignQueueController>(AdminCampaignQueueController);
    jest.clearAllMocks();
  });

  it('listPending should delegate to the service', async () => {
    await controller.listPending('1', '20');
    expect(mockCampaignService.listPendingReview).toHaveBeenCalledWith(1, 20);
  });

  it('approve should delegate to the service', async () => {
    await controller.approve('campaign-1', { comments: 'ok' }, 'admin-1');
    expect(mockCampaignService.approve).toHaveBeenCalledWith('campaign-1', 'admin-1', { comments: 'ok' });
  });

  it('reject should delegate to the service', async () => {
    await controller.reject('campaign-1', { reason: 'no' }, 'admin-1');
    expect(mockCampaignService.reject).toHaveBeenCalledWith('campaign-1', 'admin-1', { reason: 'no' });
  });

  it('requestChanges should delegate to the service', async () => {
    await controller.requestChanges('campaign-1', { comments: 'fix this' }, 'admin-1');
    expect(mockCampaignService.requestChanges).toHaveBeenCalledWith('campaign-1', 'admin-1', { comments: 'fix this' });
  });
});
