import { Test, TestingModule } from '@nestjs/testing';

import { MarketplaceService } from '../services';

import { MarketplaceController } from './marketplace.controller';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;

  const mockMarketplaceService = { listItems: jest.fn(), redeem: jest.fn(), listMyRedemptions: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [{ provide: MarketplaceService, useValue: mockMarketplaceService }],
    }).compile();

    controller = module.get<MarketplaceController>(MarketplaceController);
    jest.clearAllMocks();
  });

  it('listItems should delegate to the service', async () => {
    await controller.listItems({ page: 1, limit: 20, category: 'Gift Cards' } as never);
    expect(mockMarketplaceService.listItems).toHaveBeenCalledWith(1, 20, 'Gift Cards');
  });

  it('redeem should delegate to the service', async () => {
    await controller.redeem('user-1', 'item-1');
    expect(mockMarketplaceService.redeem).toHaveBeenCalledWith('user-1', 'item-1');
  });

  it('myRedemptions should delegate to the service', async () => {
    await controller.myRedemptions('user-1', { page: 1, limit: 20 } as never);
    expect(mockMarketplaceService.listMyRedemptions).toHaveBeenCalledWith('user-1', 1, 20);
  });
});
