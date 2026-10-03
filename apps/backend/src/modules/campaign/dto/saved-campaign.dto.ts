import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsUUID } from 'class-validator';

import { SAVED_CAMPAIGNS_MAX } from '../constants';

/** The campaigns a phone saved locally before saving moved to the server, uploaded once (newest first). */
export class ImportSavedCampaignsDto {
  @ApiProperty({ type: [String], example: ['3f2b7c1e-8f0a-4d2b-9c6e-1a2b3c4d5e6f'], maxItems: SAVED_CAMPAIGNS_MAX })
  @IsArray()
  @ArrayMaxSize(SAVED_CAMPAIGNS_MAX)
  @IsUUID('all', { each: true })
  campaignIds!: string[];
}
