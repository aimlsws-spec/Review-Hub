import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MerchantTeamRole } from '@prisma/client';

import { MERCHANT_TEAM_ROLES_KEY } from '../constants';

/**
 * Checks the caller's team role against @TeamRoles(...). It must run after MerchantOwnershipGuard or
 * CampaignOwnershipGuard, which resolve that role; put those on the class and this one on the handler.
 */
@Injectable()
export class MerchantTeamRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MerchantTeamRole[]>(MERCHANT_TEAM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role: MerchantTeamRole | undefined = request.merchantTeamRole;
    return !!role && requiredRoles.includes(role);
  }
}
