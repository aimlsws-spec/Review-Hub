import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { AiAssistService } from './ai-assist.service';

describe('AiAssistService', () => {
  let service: AiAssistService;

  const mockHttpService = { post: jest.fn() };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'ai.serviceUrl': 'http://localhost:8000',
        'ai.apiKey': 'ai-service-dev',
        'ai.apiSecret': 'dev-only-secret-change-me',
        'ai.timeoutMs': 20000,
      };
      return values[key];
    }),
  };

  const context = {
    taskType: 'TEXT',
    campaignTitle: 'Summer Launch',
    campaignDescription: 'A great new product. It ships fast.',
    taskTitle: 'Write a short review',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAssistService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(AiAssistService);
  });

  it('returns the AI service suggestion when the call succeeds', async () => {
    mockHttpService.post.mockReturnValue(of({ data: { suggestion: 'Really enjoyed it!', source: 'llm' } }));

    const result = await service.suggestText(context);

    expect(mockHttpService.post).toHaveBeenCalledWith(
      'http://localhost:8000/v1/assist/suggest-text',
      context,
      expect.objectContaining({
        headers: { 'X-Api-Key': 'ai-service-dev', 'X-Api-Secret': 'dev-only-secret-change-me' },
        timeout: 20000,
      }),
    );
    expect(result).toEqual({ suggestion: 'Really enjoyed it!', source: 'llm' });
  });

  it('falls back to a local template when the AI service call fails', async () => {
    mockHttpService.post.mockReturnValue(throwError(() => new Error('connect ECONNREFUSED')));

    const result = await service.suggestText(context);

    expect(result.source).toBe('template');
    expect(result.suggestion).toContain('Summer Launch');
  });

  it('falls back to a generic template when the campaign has no description', async () => {
    mockHttpService.post.mockReturnValue(throwError(() => new Error('timeout')));

    const result = await service.suggestText({ ...context, campaignDescription: undefined });

    expect(result.suggestion).toBe('Summer Launch — great quality and easy to use.');
  });

  describe('draftReviews', () => {
    const reviewContext = { businessName: 'Cafe Aroma', likedAspects: ['FOOD', 'SERVICE'], notes: 'Loved it' };

    it('returns the AI service drafts when the call succeeds', async () => {
      mockHttpService.post.mockReturnValue(of({ data: { drafts: ['Great food and service!'], source: 'llm' } }));

      const result = await service.draftReviews(reviewContext);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/assist/review-drafts',
        reviewContext,
        expect.objectContaining({ headers: { 'X-Api-Key': 'ai-service-dev', 'X-Api-Secret': 'dev-only-secret-change-me' } }),
      );
      expect(result).toEqual({ drafts: ['Great food and service!'], source: 'llm' });
    });

    it('falls back to local templates grounded in the liked aspects when the AI service call fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('connect ECONNREFUSED')));

      const result = await service.draftReviews(reviewContext);

      expect(result.source).toBe('template');
      expect(result.drafts.length).toBeGreaterThan(0);
      expect(result.drafts.every((d) => d.includes('Cafe Aroma'))).toBe(true);
      expect(result.drafts.every((d) => d.includes('the food') && d.includes('the service'))).toBe(true);
      expect(result.drafts.every((d) => d.endsWith('Loved it'))).toBe(true);
    });

    it('falls back to a generic aspect phrase when no aspects were given', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('timeout')));

      const result = await service.draftReviews({ businessName: 'Cafe Aroma' });

      expect(result.drafts.every((d) => d.includes('the overall experience'))).toBe(true);
    });
  });

  describe('generateCaptions', () => {
    const captionContext = { campaignTitle: 'Summer Launch', campaignDescription: 'A great new product. It ships fast.' };

    it('returns the AI service captions when the call succeeds', async () => {
      mockHttpService.post.mockReturnValue(
        of({ data: { captions: [{ style: 'short', caption: 'Summer Launch!' }], hashtags: ['#SummerLaunch'], source: 'llm' } }),
      );

      const result = await service.generateCaptions(captionContext);

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'http://localhost:8000/v1/assist/captions',
        captionContext,
        expect.objectContaining({ headers: { 'X-Api-Key': 'ai-service-dev', 'X-Api-Secret': 'dev-only-secret-change-me' } }),
      );
      expect(result.source).toBe('llm');
    });

    it('falls back to local template captions covering every style when the AI service call fails', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('connect ECONNREFUSED')));

      const result = await service.generateCaptions(captionContext);

      expect(result.source).toBe('template');
      expect(result.captions.map((c) => c.style)).toEqual(['short', 'long', 'professional', 'festival', 'emoji']);
      expect(result.captions.every((c) => c.caption.includes('Summer Launch'))).toBe(true);
      expect(result.hashtags).toEqual(['#SummerLaunch', '#ViralKar']);
    });

    it('falls back to a generic hashtag when the campaign title has no alphanumeric characters', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('timeout')));

      const result = await service.generateCaptions({ ...captionContext, campaignTitle: '!!!' });

      expect(result.hashtags).toEqual(['#ViralKar']);
    });
  });
});
