import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { MerchantTeamRole } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { MerchantRepository, MerchantTeamRepository } from '../repositories';

/**
 * The caller's role on a merchant's team, or null when they are not an active member. The owner always counts as
 * OWNER, even without a team row. Suspended and removed members get null, so they lose access straight away.
 */
export async function resolveMerchantTeamRole(
  teamRepository: MerchantTeamRepository,
  merchant: { id: string; userId: string },
  userId: string,
): Promise<MerchantTeamRole | null> {
  if (merchant.userId === userId) return 'OWNER';
  const member = await teamRepository.findByMerchantAndUser(merchant.id, userId);
  return member && member.status === 'ACTIVE' ? member.role : null;
}

/**
 * Lets through the merchant's owner and active team members, and records the caller's team role on the request
 * for MerchantTeamRoleGuard.
 */
@Injectable()
export class MerchantOwnershipGuard implements CanActivate {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly teamRepository: MerchantTeamRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const merchantId = request.params.merchantId || request.params.id || request.body?.merchantId;
    if (!merchantId) return false;

    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const role = await resolveMerchantTeamRole(this.teamRepository, merchant, user.id);
    if (!role) return false;

    request.merchant = merchant;
    request.merchantTeamRole = role;
    return true;
  }
}
