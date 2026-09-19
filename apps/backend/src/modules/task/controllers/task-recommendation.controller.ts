import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { RecommendedTaskDto } from '../dto';
import { TaskRecommendationService } from '../services';

@ApiTags(SWAGGER_TAGS.TASKS)
@Controller({ path: 'tasks', version: '1' })
export class TaskRecommendationController {
  constructor(private readonly recommendationService: TaskRecommendationService) {}

  @Get('recommended')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get this user's personalized task recommendations for the Home screen" })
  async recommended(@CurrentUser('id') userId: string): Promise<RecommendedTaskDto[]> {
    return this.recommendationService.getRecommended(userId);
  }
}
