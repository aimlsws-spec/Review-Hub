import { Test, TestingModule } from '@nestjs/testing';

import { SavedCampaignService } from '../services';

import { SavedCampaignController } from './saved-campaign.controller';

describe('SavedCampaignController', () => {
  let controller: SavedCampaignController;

  const mockService = { list: jest.fn(), save: jest.fn(), remove: jest.fn(), import: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SavedCampaignController],
      providers: [{ provide: SavedCampaignService, useValue: mockService }],
    }).compile();

    controller = module.get<SavedCampaignController>(SavedCampaignController);
    jest.clearAllMocks();
  });

  it('lists the caller’s saved campaigns', async () => {
    await controller.list('user-1');
    expect(mockService.list).toHaveBeenCalledWith('user-1');
  });

  it('saves and removes for the caller only', async () => {
    await controller.save('user-1', 'c-1');
    await controller.remove('user-1', 'c-1');

    expect(mockService.save).toHaveBeenCalledWith('user-1', 'c-1');
    expect(mockService.remove).toHaveBeenCalledWith('user-1', 'c-1');
  });

  it('imports the list the phone kept', async () => {
    await controller.import('user-1', { campaignIds: ['c-1', 'c-2'] });
    expect(mockService.import).toHaveBeenCalledWith('user-1', ['c-1', 'c-2']);
  });
});
