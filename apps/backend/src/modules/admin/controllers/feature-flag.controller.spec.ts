import { Test, TestingModule } from '@nestjs/testing';

import { FeatureFlagService } from '../services';

import { FeatureFlagController } from './feature-flag.controller';

describe('FeatureFlagController', () => {
  let controller: FeatureFlagController;

  const mockFeatureFlagService = {
    list: jest.fn(),
    getByKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureFlagController],
      providers: [{ provide: FeatureFlagService, useValue: mockFeatureFlagService }],
    }).compile();

    controller = module.get<FeatureFlagController>(FeatureFlagController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    await controller.list();
    expect(mockFeatureFlagService.list).toHaveBeenCalled();
  });

  it('create should delegate to the service', async () => {
    const dto = { key: 'ai_verification' };
    await controller.create(dto, 'admin-1');
    expect(mockFeatureFlagService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('update should delegate to the service', async () => {
    const dto = { enabled: true };
    await controller.update('ai_verification', dto, 'admin-1');
    expect(mockFeatureFlagService.update).toHaveBeenCalledWith('ai_verification', dto, 'admin-1');
  });
});
