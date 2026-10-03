import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SWAGGER_TAGS } from '@common/constants';
import { CurrentUser } from '@common/decorators';

import { AcceptInviteDto } from '../dto';
import { TeamService } from '../services';

/** Merchant routes that are not tied to one merchant id, such as joining a team from an invitation. */
@ApiTags(SWAGGER_TAGS.MERCHANTS)
@Controller({ path: 'merchants', version: '1' })
export class PublicMerchantController {
  constructor(private readonly teamService: TeamService) {}

  @Post('accept-invite')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a team invitation as the signed-in user (must own the invited email)' })
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('email') email: string | null,
  ) {
    return this.teamService.acceptInvitation(dto.token, userId, email);
  }
}
