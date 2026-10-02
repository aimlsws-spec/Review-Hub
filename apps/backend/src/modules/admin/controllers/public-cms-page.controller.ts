import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@common/decorators/public.decorator';

import { SlugParamDto } from '../dto';
import { CmsPageService } from '../services';

/**
 * Public on purpose: the sign-up screen links to the Terms & Conditions, Privacy Policy and Reward Policy before
 * anyone has an account. Only published pages are served.
 */
@ApiTags('Pages')
@Controller({ path: 'pages', version: '1' })
export class PublicCmsPageController {
  constructor(private readonly cmsPageService: CmsPageService) {}

  @Public()
  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Read a published content page, e.g. terms-and-conditions, privacy-policy or reward-policy' })
  async getBySlug(@Param() params: SlugParamDto) {
    return this.cmsPageService.getPublishedBySlug(params.slug);
  }
}
