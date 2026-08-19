import { Test, TestingModule } from '@nestjs/testing';

import { RolesGuard } from '../../auth/guards';
import { SubmissionService } from '../services';

import { SubmissionController } from './submission.controller';

describe('SubmissionController', () => {
  let controller: SubmissionController;

  const mockSubmissionService = {
    listMine: jest.fn(),
    getMine: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionController],
      providers: [
        { provide: SubmissionService, useValue: mockSubmissionService },
        RolesGuard,
      ],
    }).compile();

    controller = module.get<SubmissionController>(SubmissionController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listMine', () => {
    it('should call submissionService.listMine', async () => {
      const query = { page: 1, limit: 20 };
      await controller.listMine('user-1', query as never);
      expect(mockSubmissionService.listMine).toHaveBeenCalledWith('user-1', query);
    });
  });

  describe('getMine', () => {
    it('should call submissionService.getMine', async () => {
      await controller.getMine('submission-1', 'user-1');
      expect(mockSubmissionService.getMine).toHaveBeenCalledWith('submission-1', 'user-1');
    });
  });

  describe('approve', () => {
    it('should call submissionService.approve with the reviewer id', async () => {
      await controller.approve('submission-1', 'admin-1');
      expect(mockSubmissionService.approve).toHaveBeenCalledWith('submission-1', 'admin-1');
    });
  });

  describe('reject', () => {
    it('should call submissionService.reject with the reviewer id and reason', async () => {
      const dto = { rejectionReason: 'Blurry screenshot' };
      await controller.reject('submission-1', 'admin-1', dto as never);
      expect(mockSubmissionService.reject).toHaveBeenCalledWith('submission-1', 'admin-1', dto);
    });
  });
});
