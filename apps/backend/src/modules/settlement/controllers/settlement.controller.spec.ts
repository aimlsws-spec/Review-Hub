import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { SettlementService } from '../services';

import { SettlementController } from './settlement.controller';

describe('SettlementController', () => {
  let controller: SettlementController;

  const mockSettlementService = { listForMerchant: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [
        { provide: SettlementService, useValue: mockSettlementService },
        MerchantOwnershipGuard,
        { provide: MerchantRepository, useValue: {} },
        { provide: MerchantTeamRepository, useValue: {} },
      ],
    }).compile();

    controller = module.get<SettlementController>(SettlementController);
    jest.clearAllMocks();
  });

  it('should list settlements for the merchant', async () => {
    mockSettlementService.listForMerchant.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

    await controller.list('merchant-1', { page: 1, limit: 20 } as never);

    expect(mockSettlementService.listForMerchant).toHaveBeenCalledWith('merchant-1', 1, 20);
  });
});
