import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CaptionsDto, ReviewDraftsDto, SuggestTextDto } from '../dto';
import { AiAssistService } from '../services/ai-assist.service';

/**
 * Every route here runs a language model, which is slow and costs compute, so each is rate-limited per user
 * on top of the input length limits in the DTOs.
 */
const AI_RATE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

@ApiTags('AI Assist')
@Controller({ path: 'ai/assist', version: '1' })
export class AiAssistController {
  constructor(private readonly aiAssistService: AiAssistService) {}

  @Post('suggest-text')
  @HttpCode(HttpStatus.OK)
  @Throttle(AI_RATE_LIMIT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a text suggestion for a task' })
  async suggestText(@Body() dto: SuggestTextDto) {
    return this.aiAssistService.suggestText(dto);
  }

  @Post('review-drafts')
  @HttpCode(HttpStatus.OK)
  @Throttle(AI_RATE_LIMIT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate review drafts based on what a user liked' })
  async reviewDrafts(@Body() dto: ReviewDraftsDto) {
    return this.aiAssistService.draftReviews(dto);
  }

  @Post('captions')
  @HttpCode(HttpStatus.OK)
  @Throttle(AI_RATE_LIMIT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate captions and hashtags for a campaign' })
  async captions(@Body() dto: CaptionsDto) {
    return this.aiAssistService.generateCaptions(dto);
  }
}
