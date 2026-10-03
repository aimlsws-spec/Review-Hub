import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { ImportSavedCampaignsDto } from '../dto';
import { SavedCampaignService } from '../services';

/** The signed-in person's saved campaigns. Every response is the whole list of ids, newest first. */
@ApiTags(SWAGGER_TAGS.CAMPAIGNS)
@ApiBearerAuth()
@Controller({ path: 'users/me/saved-campaigns', version: '1' })
export class SavedCampaignController {
  constructor(private readonly savedCampaignService: SavedCampaignService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'My saved campaigns (ids, newest first)' })
  async list(@CurrentUser('id') userId: string) {
    return this.savedCampaignService.list(userId);
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload the campaigns this phone saved before saving moved to the server (once)' })
  async import(@CurrentUser('id') userId: string, @Body() dto: ImportSavedCampaignsDto) {
    return this.savedCampaignService.import(userId, dto.campaignIds);
  }

  @Put(':campaignId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a campaign for later (doing it twice changes nothing)' })
  async save(@CurrentUser('id') userId: string, @Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.savedCampaignService.save(userId, campaignId);
  }

  @Delete(':campaignId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a campaign from saved' })
  async remove(@CurrentUser('id') userId: string, @Param('campaignId', ParseUUIDPipe) campaignId: string) {
    return this.savedCampaignService.remove(userId, campaignId);
  }
}
