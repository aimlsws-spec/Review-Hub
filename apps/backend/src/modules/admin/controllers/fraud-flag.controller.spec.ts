import { Test, TestingModule } from '@nestjs/testing';

import { FraudReviewService } from '../services';

import { FraudFlagController } from './fraud-flag.controller';

describe('FraudFlagController', () => {
  let controller: FraudFlagController;

  const mockFraudReviewService = { list: jest.fn(), resolve: jest.fn(), listHighRiskDevices: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FraudFlagController],
      providers: [{ provide: FraudReviewService, useValue: mockFraudReviewService }],
    }).compile();

    controller = module.get<FraudFlagController>(FraudFlagController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockFraudReviewService.list).toHaveBeenCalledWith(query);
  });

  it('resolve should delegate to the service', async () => {
    await controller.resolve('flag-1', 'admin-1');
    expect(mockFraudReviewService.resolve).toHaveBeenCalledWith('flag-1', 'admin-1');
  });

  it('listHighRiskDevices should delegate to the service', async () => {
    const query = { minRiskScore: 40, page: 1, limit: 20 };
    await controller.listHighRiskDevices(query as never);
    expect(mockFraudReviewService.listHighRiskDevices).toHaveBeenCalledWith(query);
  });
});
