import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

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
  });
});
