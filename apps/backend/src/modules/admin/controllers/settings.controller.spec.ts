import { Test, TestingModule } from '@nestjs/testing';

import { SettingsService } from '../services';

import { SettingsController } from './settings.controller';

describe('SettingsController', () => {
  let controller: SettingsController;

  const mockSettingsService = {
    list: jest.fn(),
    getByKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
    jest.clearAllMocks();
  });

  it('list should delegate to the service', async () => {
    await controller.list('withdrawal');
    expect(mockSettingsService.list).toHaveBeenCalledWith('withdrawal');
  });

  it('getByKey should delegate to the service', async () => {
    await controller.getByKey('withdrawal.min_amount');
    expect(mockSettingsService.getByKey).toHaveBeenCalledWith('withdrawal.min_amount');
  });

  it('create should delegate to the service', async () => {
    const dto = { key: 'withdrawal.min_amount', value: 1000 };
    await controller.create(dto, 'admin-1');
    expect(mockSettingsService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('update should delegate to the service', async () => {
    const dto = { value: 2000 };
    await controller.update('withdrawal.min_amount', dto, 'admin-1');
    expect(mockSettingsService.update).toHaveBeenCalledWith('withdrawal.min_amount', dto, 'admin-1');
  });
});
