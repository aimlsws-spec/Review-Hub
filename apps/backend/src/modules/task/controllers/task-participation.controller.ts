import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { DraftReviewDto } from '../../ai/dto';
import { SubmitTaskDto } from '../dto';
import { TaskParticipationService } from '../services';

/** Runs a language model plus image composition — same cost profile as ai/assist's own routes, so the same limit. */
const AI_STORY_RATE_LIMIT = { default: { limit: 20, ttl: 60_000 } };

@ApiTags(SWAGGER_TAGS.TASKS)
@Controller({ path: 'tasks', version: '1' })
export class TaskParticipationController {
  constructor(private readonly participationService: TaskParticipationService) {}

  @Post(':taskId/start')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join the campaign and start this task' })
  async start(@Param('taskId') taskId: string, @CurrentUser('id') userId: string) {
    return this.participationService.startTask(taskId, userId);
  }

  @Get(':taskId/text-suggestion')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an AI-drafted review/caption suggestion for this task (free, optional to use)' })
  async textSuggestion(@Param('taskId') taskId: string) {
    return this.participationService.suggestText(taskId);
  }

  @Post(':taskId/review-drafts')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Draft several editable review options from what the user says they liked (review tasks only)' })
  @ApiBody({ type: DraftReviewDto })
  async reviewDrafts(@Param('taskId') taskId: string, @Body() dto: DraftReviewDto) {
    return this.participationService.draftReviews(taskId, dto);
  }

  @Get(':taskId/captions')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get AI-generated social captions (short/long/professional/festival/emoji) for this task's campaign" })
  async captions(@Param('taskId') taskId: string) {
    return this.participationService.generateCaptions(taskId);
  }

  @Post(':taskId/story')
  @HttpCode(HttpStatus.OK)
  @Throttle(AI_STORY_RATE_LIMIT)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { photo: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: "Compose a photo into a story-ready image with a caption, for this task's campaign" })
  async story(@Param('taskId') taskId: string, @UploadedFile() photo?: Express.Multer.File) {
    if (!photo) throw new BadRequestException('A photo is required to compose a story');
    return this.participationService.composeStory(taskId, photo);
  }

  @Post(':taskId/submit')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit evidence for this task' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        externalUrl: { type: 'string' },
        textAnswer: { type: 'string', description: 'Also doubles as the scanned code for a QR_SCAN task' },
        latitude: { type: 'number', description: 'Required for a LOCATION_CHECKIN task' },
        longitude: { type: 'number', description: 'Required for a LOCATION_CHECKIN task' },
      },
    },
  })
  async submit(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitTaskDto,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: Request,
  ) {
    return this.participationService.submitTask(taskId, userId, dto, file, { ip: req?.ip });
  }
}
