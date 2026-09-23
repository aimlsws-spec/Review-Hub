import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { CampaignRepository } from '../../campaign/repositories';
import { CampaignTaskRepository } from '../repositories';

import { CampaignTaskService } from './campaign-task.service';

describe('CampaignTaskService', () => {
  let service: CampaignTaskService;

  const mockCampaignTaskRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByCampaignId: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockCampaignRepository = {
    findById: jest.fn(),
  };

  const mockEventEmitter = { emit: jest.fn() };

  const draftCampaign = { id: 'campaign-1', status: 'DRAFT', visibility: 'PUBLIC' };
  const activeCampaign = { id: 'campaign-1', status: 'ACTIVE', visibility: 'PUBLIC' };
  const task = { id: 'task-1', campaignId: 'campaign-1', title: 'Follow us' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignTaskService,
        { provide: CampaignTaskRepository, useValue: mockCampaignTaskRepository },
        { provide: CampaignRepository, useValue: mockCampaignRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CampaignTaskService>(CampaignTaskService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task on a DRAFT campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignTaskRepository.create.mockResolvedValue(task);

      const result = await service.create('campaign-1', { title: 'Follow us', taskType: 'INSTAGRAM_FOLLOW' } as never);
      expect(result).toEqual(task);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('task.created', expect.any(Object));
    });

    it('should reject adding a task to a non-editable campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);

      await expect(service.create('campaign-1', {} as never)).rejects.toThrow(BadRequestException);
    });

    it('should reject an unknown campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(null);

      await expect(service.create('unknown', {} as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should reject updating a task from another campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignTaskRepository.findById.mockResolvedValue({ ...task, campaignId: 'other-campaign' });

      await expect(service.update('campaign-1', 'task-1', {} as never)).rejects.toThrow(NotFoundException);
    });

    it('should re-validate configuration against the existing (immutable) taskType', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignTaskRepository.findById.mockResolvedValue({ ...task, taskType: 'QR_SCAN' });

      await expect(service.update('campaign-1', 'task-1', { configuration: {} } as never)).rejects.toThrow(BadRequestException);

      await service.update('campaign-1', 'task-1', { configuration: { qrCode: 'STORE-42' } } as never);
      expect(mockCampaignTaskRepository.update).toHaveBeenCalledWith(
        'task-1',
        expect.objectContaining({ configuration: { qrCode: 'STORE-42' } }),
      );
    });

    it('should leave configuration untouched when not part of the update', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignTaskRepository.findById.mockResolvedValue(task);

      await service.update('campaign-1', 'task-1', { title: 'New title' } as never);
      expect(mockCampaignTaskRepository.update).toHaveBeenCalledWith('task-1', { title: 'New title' });
    });
  });

  describe('create — QR_SCAN and LOCATION_CHECKIN configuration', () => {
    beforeEach(() => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignTaskRepository.create.mockImplementation((data: Record<string, unknown>) => Promise.resolve({ id: 'task-1', ...data }));
    });

    it('requires configuration.qrCode for a QR_SCAN task', async () => {
      await expect(service.create('campaign-1', { title: 'Scan in-store', taskType: 'QR_SCAN' } as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('trims the QR code and forces proofType to QR_CODE', async () => {
      const result = await service.create('campaign-1', {
        title: 'Scan in-store',
        taskType: 'QR_SCAN',
        configuration: { qrCode: '  STORE-42  ' },
        proofType: 'SCREENSHOT',
      } as never);

      expect(result).toMatchObject({ configuration: { qrCode: 'STORE-42' }, proofType: 'QR_CODE' });
    });

    it('requires valid latitude/longitude for a LOCATION_CHECKIN task', async () => {
      await expect(
        service.create('campaign-1', { title: 'Visit us', taskType: 'LOCATION_CHECKIN', configuration: { latitude: 200, longitude: 77 } } as never),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create('campaign-1', { title: 'Visit us', taskType: 'LOCATION_CHECKIN' } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('defaults the check-in radius to 200m and forces proofType to LOCATION', async () => {
      const result = await service.create('campaign-1', {
        title: 'Visit us',
        taskType: 'LOCATION_CHECKIN',
        configuration: { latitude: 12.9716, longitude: 77.5946 },
      } as never);

      expect(result).toMatchObject({
        configuration: { latitude: 12.9716, longitude: 77.5946, radiusMeters: 200 },
        proofType: 'LOCATION',
      });
    });

    it('keeps a merchant-set radius instead of the default', async () => {
      const result = await service.create('campaign-1', {
        title: 'Visit us',
        taskType: 'LOCATION_CHECKIN',
        configuration: { latitude: 12.9716, longitude: 77.5946, radiusMeters: 50 },
      } as never);

      expect(result).toMatchObject({ configuration: expect.objectContaining({ radiusMeters: 50 }) });
    });

    it('does not touch configuration or proofType for an ordinary task', async () => {
      const result = await service.create('campaign-1', {
        title: 'Follow us',
        taskType: 'INSTAGRAM_FOLLOW',
        proofType: 'SCREENSHOT',
      } as never);

      expect(result).toMatchObject({ proofType: 'SCREENSHOT', configuration: undefined });
    });
  });

  describe('remove', () => {
    it('should soft delete a task on an editable campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);
      mockCampaignTaskRepository.findById.mockResolvedValue(task);
      mockCampaignTaskRepository.softDelete.mockResolvedValue({ ...task, deletedAt: new Date() });

      await service.remove('campaign-1', 'task-1');
      expect(mockCampaignTaskRepository.softDelete).toHaveBeenCalledWith('task-1');
    });
  });

  describe('listPublic', () => {
    it('should return tasks for an active, public campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      mockCampaignTaskRepository.findByCampaignId.mockResolvedValue([task]);

      const result = await service.listPublic('campaign-1');
      expect(result).toEqual([task]);
    });

    it('should hide tasks for a non-active campaign', async () => {
      mockCampaignRepository.findById.mockResolvedValue(draftCampaign);

      await expect(service.listPublic('campaign-1')).rejects.toThrow(NotFoundException);
    });

    it('strips the expected QR code out of a QR_SCAN task before it ever reaches the app', async () => {
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      mockCampaignTaskRepository.findByCampaignId.mockResolvedValue([
        { ...task, taskType: 'QR_SCAN', configuration: { qrCode: 'STORE-42', note: 'front desk' } },
      ]);

      const [result] = await service.listPublic('campaign-1');
      expect(result.configuration).toEqual({ note: 'front desk' });
    });

    it('keeps the full target for a LOCATION_CHECKIN task — the user needs it to get there', async () => {
      mockCampaignRepository.findById.mockResolvedValue(activeCampaign);
      const configuration = { latitude: 12.9716, longitude: 77.5946, radiusMeters: 200 };
      mockCampaignTaskRepository.findByCampaignId.mockResolvedValue([{ ...task, taskType: 'LOCATION_CHECKIN', configuration }]);

      const [result] = await service.listPublic('campaign-1');
      expect(result.configuration).toEqual(configuration);
    });
  });
});
