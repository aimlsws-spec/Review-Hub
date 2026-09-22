import { Controller, Get, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { Public } from '@common/decorators/public.decorator';

import { APP_VERSION_HEADER } from '../constants';
import { AppConfigService } from '../services';

@ApiTags(SWAGGER_TAGS.APP_CONFIG)
@Controller({ path: 'app-config', version: '1' })
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  /** Asked before sign-in, so it is public. It says nothing about any person. */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Is the platform in maintenance, and does this app version need to update?' })
  @ApiHeader({ name: 'X-App-Version', required: false, description: 'The version of the app asking, such as 1.4.2' })
  async get(@Headers(APP_VERSION_HEADER) appVersion?: string) {
    return this.appConfigService.publicView(appVersion);
  }
}
