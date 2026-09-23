import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { CaptionsDto, ComposeStoryDto, ReviewDraftsDto, SuggestTextDto } from '../dto';
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

  @Post('story')
  @HttpCode(HttpStatus.OK)
  @Throttle(AI_RATE_LIMIT)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: { type: 'string', format: 'binary' },
        campaignTitle: { type: 'string' },
        campaignDescription: { type: 'string' },
      },
    },
  })
  @ApiOperation({ summary: 'Compose a campaign photo into a story-ready image, with a caption and hashtags' })
  async story(@Body() dto: ComposeStoryDto, @UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('A photo is required to compose a story');
    return this.aiAssistService.composeStory(dto, photo);
  }
}
