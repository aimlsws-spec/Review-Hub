import { Test, TestingModule } from '@nestjs/testing';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CityRepository } from '../repositories';

import { CityService } from './city.service';

describe('CityService', () => {
  let service: CityService;

  const mockCityRepository = {
    findAllStates: jest.fn(),
    findState: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CityService,
        { provide: CityRepository, useValue: mockCityRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<CityService>(CityService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw NotFoundException for an unknown state', async () => {
      mockCityRepository.findState.mockResolvedValue(null);

      await expect(service.create({ stateId: 'unknown', name: 'Coimbatore' }, 'admin-1')).rejects.toThrow(NotFoundException);
      expect(mockCityRepository.create).not.toHaveBeenCalled();
    });

    it('should create the city under its state and audit', async () => {
      mockCityRepository.findState.mockResolvedValue({ id: 'state-1', name: 'Tamil Nadu' });
      mockCityRepository.create.mockResolvedValue({ id: 'city-1', name: 'Coimbatore', stateId: 'state-1' });

      const result = await service.create({ stateId: 'state-1', name: 'Coimbatore' }, 'admin-1');

      expect(mockCityRepository.create).toHaveBeenCalledWith({ name: 'Coimbatore', state: { connect: { id: 'state-1' } } });
      expect(result).toHaveProperty('id', 'city-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'City' }));
    });
  });

  describe('update', () => {
    it('should throw NotFoundException for an unknown city', async () => {
      mockCityRepository.findById.mockResolvedValue(null);

      await expect(service.update('unknown', { isActive: false }, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should update and audit an existing city', async () => {
      mockCityRepository.findById.mockResolvedValue({ id: 'city-1', name: 'Coimbatore', isActive: true });
      mockCityRepository.update.mockResolvedValue({ id: 'city-1', name: 'Coimbatore', isActive: false });

      const result = await service.update('city-1', { isActive: false }, 'admin-1');

      expect(result).toHaveProperty('isActive', false);
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE', entity: 'City' }));
    });
  });
});
