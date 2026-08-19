import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { MerchantTeamRole } from '@prisma/client';

import { MERCHANT_TEAM_ROLES_KEY } from '../constants';

export function TeamRoles(...roles: MerchantTeamRole[]): CustomDecorator {
  return SetMetadata(MERCHANT_TEAM_ROLES_KEY, roles);
}
