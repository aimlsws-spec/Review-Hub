import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { CreateReviewDto, ReplyReviewDto, ReviewQueryDto, UpdateReviewStatusDto } from '../dto';
import { MerchantOwnershipGuard } from '../guards';
import { ReviewService } from '../services';

@ApiTags(SWAGGER_TAGS.MERCHANTS)
@Controller({ path: 'merchants/:merchantId/reviews', version: '1' })
@UseGuards(MerchantOwnershipGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List reviews for this merchant' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(@Param('merchantId') merchantId: string, @Query() query: ReviewQueryDto) {
    return this.reviewService.list(merchantId, query);
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get review stats (total, average rating, response rate)' })
  async getStats(@Param('merchantId') merchantId: string) {
    return this.reviewService.getStats(merchantId);
  }

  @Get(':reviewId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single review' })
  async getOne(@Param('merchantId') merchantId: string, @Param('reviewId') reviewId: string) {
    return this.reviewService.getOne(merchantId, reviewId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a review received on an external platform' })
  @ApiBody({ type: CreateReviewDto })
  async create(@Param('merchantId') merchantId: string, @Body() dto: CreateReviewDto) {
    return this.reviewService.create(merchantId, dto);
  }

  @Post(':reviewId/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a review' })
  @ApiBody({ type: ReplyReviewDto })
  async reply(
    @Param('merchantId') merchantId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReplyReviewDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewService.reply(merchantId, reviewId, dto, userId);
  }

  @Patch(':reviewId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flag or resolve a review' })
  @ApiBody({ type: UpdateReviewStatusDto })
  async updateStatus(
    @Param('merchantId') merchantId: string,
    @Param('reviewId') reviewId: string,
    @Body() dto: UpdateReviewStatusDto,
  ) {
    return this.reviewService.updateStatus(merchantId, reviewId, dto);
  }

  @Delete(':reviewId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a review' })
  async delete(@Param('merchantId') merchantId: string, @Param('reviewId') reviewId: string) {
    await this.reviewService.delete(merchantId, reviewId);
    return { message: 'Review deleted successfully' };
  }
}
