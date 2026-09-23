import { Test, TestingModule } from '@nestjs/testing';

import { CityService } from '../services';

import { CityController } from './city.controller';

describe('CityController', () => {
  let controller: CityController;

  const mockCityService = {
    listStates: jest.fn(),
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CityController],
      providers: [{ provide: CityService, useValue: mockCityService }],
    }).compile();

    controller = module.get<CityController>(CityController);
    jest.clearAllMocks();
  });

  it('listStates should delegate to the service', async () => {
    await controller.listStates();
    expect(mockCityService.listStates).toHaveBeenCalled();
  });

  it('list should delegate to the service', async () => {
    const query = { page: 1, limit: 20 };
    await controller.list(query as never);
    expect(mockCityService.list).toHaveBeenCalledWith(query);
  });

  it('create should delegate to the service', async () => {
    const dto = { stateId: 'state-1', name: 'Coimbatore' };
    await controller.create(dto, 'admin-1');
    expect(mockCityService.create).toHaveBeenCalledWith(dto, 'admin-1');
  });

  it('update should delegate to the service', async () => {
    await controller.update('city-1', { isActive: false }, 'admin-1');
    expect(mockCityService.update).toHaveBeenCalledWith('city-1', { isActive: false }, 'admin-1');
  });
});
