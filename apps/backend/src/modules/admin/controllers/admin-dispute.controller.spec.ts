import { Test, TestingModule } from '@nestjs/testing';

import { DisputeService } from '../../task/services/dispute.service';

import { AdminDisputeController } from './admin-dispute.controller';

describe('AdminDisputeController', () => {
  let controller: AdminDisputeController;

  const mockDisputeService = { getAdminDisputes: jest.fn(), resolveDispute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminDisputeController],
      providers: [{ provide: DisputeService, useValue: mockDisputeService }],
    }).compile();

    controller = module.get<AdminDisputeController>(AdminDisputeController);
    jest.clearAllMocks();
  });

  it('listDisputes should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.listDisputes(query as never);
    expect(mockDisputeService.getAdminDisputes).toHaveBeenCalledWith(query);
  });

  it('resolveDispute should delegate to the service with the reviewer id', async () => {
    const dto = { decision: 'UPHELD' as const };
    await controller.resolveDispute('dispute-1', 'admin-1', dto);
    expect(mockDisputeService.resolveDispute).toHaveBeenCalledWith('dispute-1', 'admin-1', dto);
  });
});
