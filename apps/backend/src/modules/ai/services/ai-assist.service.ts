import { randomUUID } from 'crypto';

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import sharp from 'sharp';

import { LocalStorageService } from '../../../storage/storage.service';
import { AI_ASSIST_GENEROUS_TIMEOUT_MS } from '../constants';

import { buildReviewDraftTemplates, ReviewDraftAnswers } from './review-draft-templates';

export interface TextSuggestionContext {
  taskType: string;
  campaignTitle: string;
  campaignDescription?: string;
  taskTitle: string;
  taskInstructions?: string;
}

export interface TextSuggestionResult {
  suggestion: string;
  source: 'llm' | 'template';
}

/** What the person said about their own visit, plus the business name. Nothing here is worked out on their behalf. */
export type ReviewDraftContext = ReviewDraftAnswers;

export interface ReviewDraftResult {
  drafts: string[];
  source: 'llm' | 'template';
}

export interface CaptionContext {
  campaignTitle: string;
  campaignDescription?: string;
}

export interface CaptionStyleResult {
  style: string;
  caption: string;
}

export interface CaptionResult {
  captions: CaptionStyleResult[];
  hashtags: string[];
  source: 'llm' | 'template';
}

export interface StoryResult {
  imageUrl: string;
  caption: string;
  hashtags: string[];
}

/**
 * Calls out to apps/ai-services for a suggested caption/review draft. The AI
 * service itself never requires a paid key (it falls back to a local
 * template when its optional LLM isn't configured) — and if the AI service
 * is unreachable entirely, this falls back to the same kind of plain
 * template locally, so a down AI service never blocks a user mid-task.
 */
@Injectable()
export class AiAssistService {
  private readonly logger = new Logger(AiAssistService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly storageService: LocalStorageService,
  ) {}

  async suggestText(context: TextSuggestionContext): Promise<TextSuggestionResult> {
    const baseUrl = this.configService.get<string>('ai.serviceUrl');
    const apiKey = this.configService.get<string>('ai.apiKey');
    const apiSecret = this.configService.get<string>('ai.apiSecret');
    const timeoutMs = this.configService.get<number>('ai.timeoutMs');

    try {
      const response = await firstValueFrom(
        this.httpService.post<TextSuggestionResult>(`${baseUrl}/v1/assist/suggest-text`, context, {
          headers: { 'X-Api-Key': apiKey, 'X-Api-Secret': apiSecret },
          timeout: timeoutMs,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`AI service unavailable for text suggestion, falling back to a local template: ${(error as AxiosError).message}`);
      return { suggestion: this.buildFallbackTemplate(context), source: 'template' };
    }
  }

  private buildFallbackTemplate(context: TextSuggestionContext): string {
    const highlight = context.campaignDescription?.trim().split('.')[0]?.slice(0, 120) || 'great quality and easy to use';
    return `${context.campaignTitle} — ${highlight}.`;
  }

  /**
   * The guided review assistant — drafts several editable options grounded
   * in what the user actually said: what they liked, what could be better, and how
   * it went overall. Never invents an experience or a recommendation; every draft
   * is meant to be edited and posted by the user themselves.
   */
  async draftReviews(context: ReviewDraftContext): Promise<ReviewDraftResult> {
    const baseUrl = this.configService.get<string>('ai.serviceUrl');
    const apiKey = this.configService.get<string>('ai.apiKey');
    const apiSecret = this.configService.get<string>('ai.apiSecret');

    try {
      const response = await firstValueFrom(
        this.httpService.post<ReviewDraftResult>(`${baseUrl}/v1/assist/review-drafts`, context, {
          headers: { 'X-Api-Key': apiKey, 'X-Api-Secret': apiSecret },
          timeout: AI_ASSIST_GENEROUS_TIMEOUT_MS,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`AI service unavailable for review drafts, falling back to local templates: ${(error as AxiosError).message}`);
      return { drafts: buildReviewDraftTemplates(context), source: 'template' };
    }
  }

  async generateCaptions(context: CaptionContext): Promise<CaptionResult> {
    const baseUrl = this.configService.get<string>('ai.serviceUrl');
    const apiKey = this.configService.get<string>('ai.apiKey');
    const apiSecret = this.configService.get<string>('ai.apiSecret');

    try {
      const response = await firstValueFrom(
        this.httpService.post<CaptionResult>(`${baseUrl}/v1/assist/captions`, context, {
          headers: { 'X-Api-Key': apiKey, 'X-Api-Secret': apiSecret },
          timeout: AI_ASSIST_GENEROUS_TIMEOUT_MS,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`AI service unavailable for captions, falling back to local templates: ${(error as AxiosError).message}`);
      const { captions, hashtags } = this.buildFallbackCaptions(context);
      return { captions, hashtags, source: 'template' };
    }
  }

  private buildFallbackCaptions(context: CaptionContext): { captions: CaptionStyleResult[]; hashtags: string[] } {
    const description = context.campaignDescription?.trim().split('.')[0]?.slice(0, 120) || "Something you don't want to miss.";
    const captions: CaptionStyleResult[] = [
      { style: 'short', caption: `${context.campaignTitle} — don't miss it!` },
      { style: 'long', caption: `${context.campaignTitle}. ${description} Check it out and see for yourself.` },
      { style: 'professional', caption: `Introducing ${context.campaignTitle}. ${description}` },
      { style: 'festival', caption: `🎉 ${context.campaignTitle} is here — celebrate with us! ${description}` },
      { style: 'emoji', caption: `✨ ${context.campaignTitle} ✨ ${description} 🔥` },
    ];
    const slug = context.campaignTitle.replace(/[^a-zA-Z0-9]/g, '');
    const hashtags = slug ? [`#${slug}`, '#ViralKar'] : ['#ViralKar'];
    return { captions, hashtags };
  }


  /** Composes a campaign photo into a story-ready image (a plain background plus the photo, no generative model), reusing generateCaptions' text/hashtags rather than drafting new ones. */
  async composeStory(context: CaptionContext, photo: Express.Multer.File): Promise<StoryResult> {
    const { captions, hashtags } = await this.generateCaptions(context);

    const composedBuffer = await sharp({
      create: {
        width: 1080,
        height: 1920,
        channels: 4,
        background: { r: 200, g: 200, b: 200, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp(photo.buffer).resize(1000, 1000, { fit: 'cover' }).toBuffer(),
          top: 200,
          left: 40,
        },
      ])
      .jpeg()
      .toBuffer();

    // A fixed filename would let every story overwrite the last one saved.
    const uploadResult = await this.storageService.saveFile(composedBuffer, `${randomUUID()}.jpg`, 'stories');

    return {
      imageUrl: uploadResult.path,
      caption: captions[0]?.caption ?? '',
      hashtags,
    };
  }
}
