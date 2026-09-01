import { Test, TestingModule } from '@nestjs/testing';

import { DailyRewardPrizeAdminService } from '../services';

import { AdminDailyRewardPrizeController } from './admin-daily-reward-prize.controller';

describe('AdminDailyRewardPrizeController', () => {
  let controller: AdminDailyRewardPrizeController;

  const mockPrizeAdminService = { list: jest.fn(), getById: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDailyRewardPrizeController],
      providers: [{ provide: DailyRewardPrizeAdminService, useValue: mockPrizeAdminService }],
    }).compile();

    controller = module.get<AdminDailyRewardPrizeController>(AdminDailyRewardPrizeController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockPrizeAdminService.list).toHaveBeenCalledWith(query);
  });

  it('create should delegate to the service', async () => {
    const dto = { label: 'Big', amount: 100, weight: 10 };
    await controller.create(dto as never, 'admin-1');
    expect(mockPrizeAdminService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('remove should delegate to the service', async () => {
    await controller.remove('prize-1', 'admin-1');
    expect(mockPrizeAdminService.remove).toHaveBeenCalledWith('prize-1', 'admin-1');
  });
});
