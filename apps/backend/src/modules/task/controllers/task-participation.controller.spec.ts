import { Test, TestingModule } from '@nestjs/testing';

import { TaskParticipationService } from '../services';

import { TaskParticipationController } from './task-participation.controller';

describe('TaskParticipationController', () => {
  let controller: TaskParticipationController;

  const mockParticipationService = {
    startTask: jest.fn(),
    submitTask: jest.fn(),
    draftReviews: jest.fn(),
    generateCaptions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskParticipationController],
      providers: [{ provide: TaskParticipationService, useValue: mockParticipationService }],
    }).compile();

    controller = module.get<TaskParticipationController>(TaskParticipationController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('start', () => {
    it('should call participationService.startTask', async () => {
      await controller.start('task-1', 'user-1');
      expect(mockParticipationService.startTask).toHaveBeenCalledWith('task-1', 'user-1');
    });
  });

  describe('reviewDrafts', () => {
    it('should call participationService.draftReviews with the taskId and dto', async () => {
      const dto = { likedAspects: ['FOOD'] };
      mockParticipationService.draftReviews.mockResolvedValue({ drafts: ['Great food!'], source: 'llm' });

      const result = await controller.reviewDrafts('task-1', dto as never);

      expect(mockParticipationService.draftReviews).toHaveBeenCalledWith('task-1', dto);
      expect(result).toEqual({ drafts: ['Great food!'], source: 'llm' });
    });
  });

  describe('captions', () => {
    it('should call participationService.generateCaptions with the taskId', async () => {
      mockParticipationService.generateCaptions.mockResolvedValue({ captions: [], hashtags: [], source: 'template' });

      const result = await controller.captions('task-1');

      expect(mockParticipationService.generateCaptions).toHaveBeenCalledWith('task-1');
      expect(result.source).toBe('template');
    });
  });

  describe('submit', () => {
    it('should call participationService.submitTask with the uploaded file', async () => {
      const dto = { textAnswer: 'done' };
      const file = { originalname: 'proof.jpg' } as Express.Multer.File;

      await controller.submit('task-1', 'user-1', dto as never, file);
      expect(mockParticipationService.submitTask).toHaveBeenCalledWith('task-1', 'user-1', dto, file);
    });

    it('should call participationService.submitTask without a file', async () => {
      const dto = { textAnswer: 'done' };

      await controller.submit('task-1', 'user-1', dto as never, undefined);
      expect(mockParticipationService.submitTask).toHaveBeenCalledWith('task-1', 'user-1', dto, undefined);
    });
  });
});
