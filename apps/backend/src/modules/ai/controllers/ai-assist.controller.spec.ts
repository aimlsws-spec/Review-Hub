import { Test, TestingModule } from '@nestjs/testing';

import { AiAssistService } from '../services/ai-assist.service';

import { AiAssistController } from './ai-assist.controller';

describe('AiAssistController', () => {
  let controller: AiAssistController;
  const mockService = { suggestText: jest.fn(), draftReviews: jest.fn(), generateCaptions: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAssistController],
      providers: [{ provide: AiAssistService, useValue: mockService }],
    }).compile();

    controller = module.get<AiAssistController>(AiAssistController);
    jest.clearAllMocks();
  });

  it('delegates each route to the matching service call', async () => {
    const suggest = { taskType: 'TEXT', campaignTitle: 'T', taskTitle: 'T' };
    const review = { businessName: 'B' };
    const captions = { campaignTitle: 'T' };

    await controller.suggestText(suggest as never);
    await controller.reviewDrafts(review as never);
    await controller.captions(captions as never);

    expect(mockService.suggestText).toHaveBeenCalledWith(suggest);
    expect(mockService.draftReviews).toHaveBeenCalledWith(review);
    expect(mockService.generateCaptions).toHaveBeenCalledWith(captions);
  });

  it('rate-limits every model-backed route to 20 requests a minute per user', () => {
    for (const route of ['suggestText', 'reviewDrafts', 'captions'] as const) {
      const handler = AiAssistController.prototype[route];
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(20);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(60_000);
    }
  });
});
