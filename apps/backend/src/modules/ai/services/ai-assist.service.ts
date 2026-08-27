import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

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
}
