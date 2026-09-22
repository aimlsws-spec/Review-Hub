import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { SWAGGER_TAGS } from '@common/constants';
import { Public } from '@common/decorators/public.decorator';

import { InviteService } from '../services';

@ApiTags(SWAGGER_TAGS.REFERRALS)
@Controller({ path: 'invite', version: '1' })
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  /** What a shared referral link opens. Public, since the person opening it has no account yet. */
  @Public()
  @Get(':code')
  @ApiOperation({ summary: 'Open an invite link: sends the person to the app store, with the referral code attached' })
  async open(@Param('code') code: string, @Res() res: Response) {
    res.redirect(302, await this.inviteService.destinationFor(code));
  }
}
