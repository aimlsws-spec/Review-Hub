import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';

import { MerchantRepository, MerchantTeamRepository } from '../repositories';

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
    if (!merchant) throw new NotFoundException('Merchant not found');

    const isOwner = merchant.userId === user.id;
    if (!isOwner) {
      const teamMember = await this.teamRepository.findByMerchantAndUser(merchantId, user.id);
      if (!teamMember) return false;
    }

    request.merchant = merchant;
    return true;
  }
}
