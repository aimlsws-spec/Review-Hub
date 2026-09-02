import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { AI_ASSIST_GENEROUS_TIMEOUT_MS } from '../constants';

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

export interface ReviewDraftContext {
  businessName: string;
  likedAspects?: string[];
  notes?: string;
}

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
   * in what the user actually said they liked. Never invents an experience;
   * every draft is meant to be edited and posted by the user themselves.
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
      return { drafts: this.buildFallbackReviewDrafts(context), source: 'template' };
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

  private buildFallbackReviewDrafts(context: ReviewDraftContext): string[] {
    const aspectLabels: Record<string, string> = {
      FOOD: 'the food',
      STAFF: 'the staff',
      PRICE: 'the price',
      CLEANLINESS: 'cleanliness',
      SERVICE: 'the service',
    };
    const labels = (context.likedAspects ?? []).map((a) => aspectLabels[a] ?? a.toLowerCase());
    const aspects = labels.length === 0
      ? 'the overall experience'
      : labels.length === 1
        ? labels[0]
        : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
    const note = context.notes?.trim();

    const openers = [
      `Visited ${context.businessName} recently and really liked ${aspects}.`,
      `${context.businessName} stood out for ${aspects} — a solid experience overall.`,
      `Had a good experience at ${context.businessName}, especially when it came to ${aspects}.`,
      `Would recommend ${context.businessName} — ${aspects} left a good impression.`,
    ];
    return note ? openers.map((d) => `${d} ${note}`) : openers;
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
}
