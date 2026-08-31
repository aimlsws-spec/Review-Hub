import { Injectable } from '@nestjs/common';

import { ReferralQueryDto } from '../dto';
import { ReferralRepository } from '../repositories';

@Injectable()
export class ReferralService {
  constructor(private readonly referralRepository: ReferralRepository) {}

  async listMine(userId: string, query: ReferralQueryDto) {
    return this.referralRepository.findByReferrer({
      referrerId: userId,
      page: query.page,
      limit: query.limit,
    });
  }

  async getMyStats(userId: string) {
    return this.referralRepository.getStats(userId);
  }

  async getLeaderboard(limit: number) {
    return this.referralRepository.getLeaderboard(limit);
  }
}
