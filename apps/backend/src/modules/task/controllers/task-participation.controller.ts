import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { DraftReviewDto } from '../../ai/dto';
import { SubmitTaskDto } from '../dto';
import { TaskParticipationService } from '../services';

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
        textAnswer: { type: 'string' },
      },
    },
  })
  async submit(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitTaskDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.participationService.submitTask(taskId, userId, dto, file);
  }
}
