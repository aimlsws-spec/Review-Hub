import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';

import { MerchantWalletRepository } from '../../modules/merchant/repositories';
import { RewardCreditedEvent } from '../../modules/wallet/events';
import { RewardJobData } from '../../modules/wallet/interfaces';
import { RewardRepository, UserWalletRepository } from '../../modules/wallet/repositories';
import { QUEUE_NAMES } from '../../queues/queue.constants';

/** A reward in one of these states still has work left, or is finished but may not have charged the merchant yet. */
const PAYABLE_STATUSES = ['PENDING', 'APPROVED', 'CREDITED'];

/**
 * Turns an approved task submission into money: create the reward, credit the user, mark it credited, then charge
 * the campaign budget.
 *
 * WHY every step can be repeated: those are separate database operations, and BullMQ retries a job that throws. The
 * old check "a reward already exists, so skip" could not tell a finished reward from one that failed half-way, so a
 * single transient failure (a lock wait, a dropped connection) left a reward that was never paid and a budget that
 * was never charged, permanently. Now a retry works out what is still missing and does only that:
 * the reward row is unique per submission, the credit and the budget charge are each recorded in the ledger against
 * the reward's id, and both check the ledger before applying.
 */
@Processor(QUEUE_NAMES.REWARDS)
export class RewardProcessor extends WorkerHost {
  private readonly logger = new Logger(RewardProcessor.name);

  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly walletRepository: UserWalletRepository,
    private readonly merchantWalletRepository: MerchantWalletRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<RewardJobData>): Promise<void> {
    const event = job.data;

    let reward = await this.rewardRepository.findBySubmissionId(event.submissionId);
    if (reward && !PAYABLE_STATUSES.includes(reward.status)) {
      // Reversed, cancelled or failed: a person has to look at it, a retry must not pay it.
      this.logger.warn(`Reward ${reward.id} for submission ${event.submissionId} is ${reward.status}, not paying it`);
      return;
    }
    if (!reward) reward = await this.createReward(event);

    // Already fully credited by an earlier run. Only the budget charge may still be missing, and it is a no-op if not.
    const wasCredited = reward.status === 'CREDITED';

    if (!wasCredited) {
      const wallet = await this.walletRepository.getOrCreate(event.userId);
      await this.walletRepository.creditAvailable({
        walletId: wallet.id,
        amount: event.rewardAmount,
        type: 'CREDIT',
        referenceType: 'Reward',
        referenceId: reward.id,
        remarks: 'Task reward',
        idempotent: true,
      });
      await this.rewardRepository.markCredited(reward.id);
    }

    await this.merchantWalletRepository.spendCampaignBudget({
      campaignId: event.campaignId,
      amount: event.rewardAmount,
      rewardId: reward.id,
    });

    if (wasCredited) {
      this.logger.log(`Reward ${reward.id} was already credited, made sure the campaign budget was charged`);
      return;
    }

    this.logger.log(`Credited ₹${event.rewardAmount} to user ${event.userId} for submission ${event.submissionId}`);
    this.eventEmitter.emit('wallet.reward.credited', new RewardCreditedEvent(event.userId, reward.id, event.rewardAmount));
  }

  /** Two jobs for one submission can both find no reward; the loser hits the unique constraint and uses the winner's. */
  private async createReward(event: RewardJobData) {
    try {
      return await this.rewardRepository.create({
        user: { connect: { id: event.userId } },
        campaign: { connect: { id: event.campaignId } },
        submission: { connect: { id: event.submissionId } },
        rewardType: 'CASH',
        amount: event.rewardAmount,
        status: 'APPROVED',
        approvedAt: new Date(),
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.rewardRepository.findBySubmissionId(event.submissionId);
        if (existing) return existing;
      }
      throw error;
    }
  }
}
