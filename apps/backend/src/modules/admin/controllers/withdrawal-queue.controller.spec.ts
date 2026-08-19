import { Test, TestingModule } from '@nestjs/testing';

import { WithdrawalService } from '../../wallet/services';

import { AdminWithdrawalQueueController } from './withdrawal-queue.controller';

describe('AdminWithdrawalQueueController', () => {
  let controller: AdminWithdrawalQueueController;

  const mockWithdrawalService = { listPendingForAdmin: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminWithdrawalQueueController],
      providers: [{ provide: WithdrawalService, useValue: mockWithdrawalService }],
    }).compile();

    controller = module.get<AdminWithdrawalQueueController>(AdminWithdrawalQueueController);
    jest.clearAllMocks();
  });

  it('listPending should delegate to the service', async () => {
    await controller.listPending('1', '20');
    expect(mockWithdrawalService.listPendingForAdmin).toHaveBeenCalledWith(1, 20);
  });
});
