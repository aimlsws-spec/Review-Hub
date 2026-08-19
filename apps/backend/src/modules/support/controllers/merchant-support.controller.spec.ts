import { Test, TestingModule } from '@nestjs/testing';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { MerchantRepository, MerchantTeamRepository } from '../../merchant/repositories';
import { SupportService } from '../services';

import { MerchantSupportController } from './merchant-support.controller';

describe('MerchantSupportController', () => {
  let controller: MerchantSupportController;

  const mockSupportService = {
    createAsMerchant: jest.fn(),
    listMineAsMerchant: jest.fn(),
    getForMerchant: jest.fn(),
    replyAsMerchant: jest.fn(),
  };
  const mockMerchantRepository = {};
  const mockTeamRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantSupportController],
      providers: [
        { provide: SupportService, useValue: mockSupportService },
        MerchantOwnershipGuard,
        { provide: MerchantRepository, useValue: mockMerchantRepository },
        { provide: MerchantTeamRepository, useValue: mockTeamRepository },
      ],
    }).compile();

    controller = module.get<MerchantSupportController>(MerchantSupportController);
    jest.clearAllMocks();
  });

  it('create should delegate to the service', async () => {
    const dto = { subject: 'Help', description: 'Payout question' };
    await controller.create('merchant-1', dto);
    expect(mockSupportService.createAsMerchant).toHaveBeenCalledWith('merchant-1', dto);
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list('merchant-1', query as never);
    expect(mockSupportService.listMineAsMerchant).toHaveBeenCalledWith('merchant-1', query);
  });

  it('getOne should delegate to the service', async () => {
    await controller.getOne('merchant-1', 'ticket-1');
    expect(mockSupportService.getForMerchant).toHaveBeenCalledWith('ticket-1', 'merchant-1');
  });

  it('reply should delegate to the service', async () => {
    const dto = { message: 'Following up' };
    await controller.reply('merchant-1', 'ticket-1', 'user-1', dto);
    expect(mockSupportService.replyAsMerchant).toHaveBeenCalledWith('ticket-1', 'merchant-1', 'user-1', dto);
  });
});
