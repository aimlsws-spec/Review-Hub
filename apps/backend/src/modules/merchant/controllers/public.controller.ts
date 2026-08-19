import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { Public } from '@common/decorators';

import { TeamService } from '../services';

@ApiTags(SWAGGER_TAGS.MERCHANTS)
@Controller({ path: 'merchants', version: '1' })
export class PublicMerchantController {
  constructor(private readonly teamService: TeamService) {}

  @Post('accept-invite/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept team invitation (public)' })
  async acceptInvite(@Param('token') token: string, @Body('userId') userId: string, @Body('email') email: string) {
    return this.teamService.acceptInvitation(token, userId, email);
  }
}
