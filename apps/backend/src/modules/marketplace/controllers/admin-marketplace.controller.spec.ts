import { Test, TestingModule } from '@nestjs/testing';

import { MarketplaceItemAdminService } from '../services';

import { AdminMarketplaceController } from './admin-marketplace.controller';

describe('AdminMarketplaceController', () => {
  let controller: AdminMarketplaceController;

  const mockItemAdminService = { list: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), listRedemptions: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminMarketplaceController],
      providers: [{ provide: MarketplaceItemAdminService, useValue: mockItemAdminService }],
    }).compile();

    controller = module.get<AdminMarketplaceController>(AdminMarketplaceController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockItemAdminService.list).toHaveBeenCalledWith(query);
  });

  it('create should delegate to the service', async () => {
    const dto = { title: 'Gift Card', description: 'x', costAmount: 100 };
    await controller.create(dto as never, 'admin-1');
    expect(mockItemAdminService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('remove should delegate to the service', async () => {
    await controller.remove('item-1', 'admin-1');
    expect(mockItemAdminService.remove).toHaveBeenCalledWith('item-1', 'admin-1');
  });

  it('listRedemptions should delegate to the service', async () => {
    await controller.listRedemptions({ page: 1, limit: 20 } as never);
    expect(mockItemAdminService.listRedemptions).toHaveBeenCalledWith(1, 20);
  });
});
