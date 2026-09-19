import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AiAssistService } from '../services/ai-assist.service';

@ApiTags('AI Assist')
@Controller({ path: 'ai/assist', version: '1' })
export class AiAssistController {
  constructor(private readonly aiAssistService: AiAssistService) {}

  @Post('suggest-text')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a text suggestion for a task' })
  async suggestText(
    @Body() dto: { taskType: string; campaignTitle: string; campaignDescription?: string; taskTitle: string; taskInstructions?: string }
  ) {
    return this.aiAssistService.suggestText(dto);
  }

  @Post('review-drafts')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate review drafts based on what a user liked' })
  async reviewDrafts(
    @Body() dto: { businessName: string; likedAspects?: string[]; notes?: string }
  ) {
    return this.aiAssistService.draftReviews(dto);
  }

  @Post('captions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate captions and hashtags for a campaign' })
  async captions(
    @Body() dto: { campaignTitle: string; campaignDescription?: string }
  ) {
    return this.aiAssistService.generateCaptions(dto);
  }
}
