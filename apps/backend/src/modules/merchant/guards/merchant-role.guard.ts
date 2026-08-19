import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MerchantTeamRole } from '@prisma/client';

import { MERCHANT_TEAM_ROLES_KEY } from '../constants';
import { MerchantTeamRepository } from '../repositories';

@Injectable()
export class MerchantTeamRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly teamRepository: MerchantTeamRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MerchantTeamRole[]>(MERCHANT_TEAM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const merchant = request.merchant;
    if (!user || !merchant) return false;

    const teamMember = await this.teamRepository.findByMerchantAndUser(merchant.id, user.id);
    if (!teamMember) return false;

    return requiredRoles.includes(teamMember.role);
  }
}
