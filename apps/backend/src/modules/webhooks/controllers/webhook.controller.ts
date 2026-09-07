import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { PaginationQueryDto } from '@common/dto';

import { MerchantOwnershipGuard } from '../../merchant/guards';
import { CreateWebhookDto, UpdateWebhookDto } from '../dto';
import { WebhookService } from '../services';

@ApiTags(SWAGGER_TAGS.WEBHOOKS)
@Controller({ path: 'merchants/:merchantId/webhooks', version: '1' })
@UseGuards(MerchantOwnershipGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List a merchant's webhooks" })
  async list(@Param('merchantId') merchantId: string) {
    return this.webhookService.listForMerchant(merchantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a webhook' })
  async create(@Param('merchantId') merchantId: string, @Body() dto: CreateWebhookDto) {
    return this.webhookService.create(merchantId, dto);
  }

  @Patch(':webhookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a webhook' })
  async update(
    @Param('merchantId') merchantId: string,
    @Param('webhookId') webhookId: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.update(webhookId, merchantId, dto);
  }

  @Delete(':webhookId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a webhook' })
  async remove(@Param('merchantId') merchantId: string, @Param('webhookId') webhookId: string) {
    return this.webhookService.remove(webhookId, merchantId);
  }

  @Get(':webhookId/deliveries')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List delivery attempts for a webhook' })
  async listDeliveries(
    @Param('merchantId') merchantId: string,
    @Param('webhookId') webhookId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.webhookService.listDeliveries(webhookId, merchantId, query.page, query.limit);
  }
}
