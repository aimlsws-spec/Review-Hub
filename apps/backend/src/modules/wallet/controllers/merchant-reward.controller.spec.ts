import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { WalletService } from '../services';

import { MerchantRewardController } from './merchant-reward.controller';

describe('MerchantRewardController', () => {
  let controller: MerchantRewardController;

  const mockWalletService = { getMerchantRewards: jest.fn() };
  const mockMerchantRepository = {};
  const mockTeamRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantRewardController],
      providers: [
        { provide: WalletService, useValue: mockWalletService },
        MerchantOwnershipGuard,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantTeamRepository, useValue: mockTeamRepository },
      ],
    }).compile();

    controller = module.get<MerchantRewardController>(MerchantRewardController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service with numeric pagination', async () => {
    await controller.list('merchant-1', '2', '10');
    expect(mockWalletService.getMerchantRewards).toHaveBeenCalledWith('merchant-1', 2, 10);
  });

  it('list should default page/limit when omitted', async () => {
    await controller.list('merchant-1');
    expect(mockWalletService.getMerchantRewards).toHaveBeenCalledWith('merchant-1', 1, 20);
  });
});
