import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { DeviceRepository } from '../../auth/repositories/device.repository';
import { MerchantWalletRepository } from '../../merchant/repositories';
import { RewardReversedEvent } from '../../wallet/events';
import { RewardRepository, UserWalletRepository } from '../../wallet/repositories';
import { FraudFlagQueryDto, HighRiskDeviceQueryDto, ReverseRewardDto } from '../dto';
import { FraudFlagRepository } from '../repositories';

@Injectable()
export class FraudReviewService {
  constructor(
    private readonly fraudFlagRepository: FraudFlagRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly rewardRepository: RewardRepository,
    private readonly userWalletRepository: UserWalletRepository,
    private readonly merchantWalletRepository: MerchantWalletRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: FraudFlagQueryDto) {
    return this.fraudFlagRepository.findAll({
      page: query.page,
      limit: query.limit,
      resolved: query.resolved,
      riskLevel: query.riskLevel,
    });
  }

  /**
   * Devices flagged by the basic risk signals captured at login/register
   * (self-reported root/emulator + a free header-based VPN heuristic — see
   * DeviceService.calculateRiskScore). Visibility only for now; nothing in
   * the platform blocks on this score yet.
   */
  async listHighRiskDevices(query: HighRiskDeviceQueryDto) {
    return this.deviceRepository.findHighRisk({
      minRiskScore: query.minRiskScore,
      page: query.page,
      limit: query.limit,
    });
  }

  async resolve(flagId: string, adminId: string) {
    const flag = await this.fraudFlagRepository.findById(flagId);
    if (!flag) throw new NotFoundException('Fraud flag');
    if (flag.resolved) throw new BadRequestException('Fraud flag is already resolved');

    const updated = await this.fraudFlagRepository.resolve(flagId, adminId);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SubmissionFraudFlag',
      entityId: flagId,
      action: 'UPDATE',
      before: { resolved: false },
      after: { resolved: true },
    });

    return updated;
  }

  /**
   * Claws back a reward after fraud is confirmed for its submission. The
   * user's wallet is debited only as far as their available balance allows
   * (never negative) — any uncollected remainder is recorded as a shortfall
   * rather than blocked on or automatically pursued. The merchant's campaign
   * budget is always restored in full regardless of that shortfall — the
   * platform absorbs the gap, not the merchant.
   */
  async reverseReward(flagId: string, adminId: string, dto: ReverseRewardDto) {
    const flag = await this.fraudFlagRepository.findById(flagId);
    if (!flag) throw new NotFoundException('Fraud flag');

    const reward = await this.rewardRepository.findBySubmissionId(flag.submissionId);
    if (!reward) throw new NotFoundException('Reward for this submission');
    if (reward.status !== 'CREDITED') {
      throw new BadRequestException(`Reward is ${reward.status.toLowerCase()}, not credited — nothing to reverse`);
    }

    const wallet = await this.userWalletRepository.getOrCreate(reward.userId);
    const amount = Number(reward.amount);

    const { recoverable, shortfall } = await this.userWalletRepository.clawbackReward({
      walletId: wallet.id,
      amount,
      referenceId: reward.id,
      remarks: `Reward reversed — ${dto.reason}`,
    });

    await this.merchantWalletRepository.restoreClawedBackBudget({
      campaignId: reward.campaignId,
      amount,
      rewardId: reward.id,
    });

    const updatedReward = await this.rewardRepository.markReversed(reward.id, {
      reversedAmount: recoverable,
      shortfallAmount: shortfall,
      reversalReason: dto.reason,
      reversedBy: adminId,
    });

    if (!flag.resolved) {
      await this.fraudFlagRepository.resolve(flagId, adminId);
    }

    this.eventEmitter.emit('wallet.reward.reversed', new RewardReversedEvent(reward.userId, reward.id, recoverable, shortfall));

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'Reward',
      entityId: reward.id,
      action: 'STATUS_CHANGE',
      before: { status: 'CREDITED' },
      after: { status: 'REVERSED', reversedAmount: recoverable, shortfallAmount: shortfall, reason: dto.reason },
    });

    return updatedReward;
  }
}
