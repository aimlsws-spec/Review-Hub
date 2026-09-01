import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';

import { MerchantWalletRepository } from '../../modules/merchant/repositories';
import { RewardCreditedEvent } from '../../modules/wallet/events';
import { RewardJobData } from '../../modules/wallet/interfaces';
import { RewardRepository, UserWalletRepository } from '../../modules/wallet/repositories';
import { QUEUE_NAMES } from '../../queues/queue.constants';

/** Turns an approved task submission into money. Idempotent on Reward.submissionId being unique. */
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

    const existing = await this.rewardRepository.findBySubmissionId(event.submissionId);
    if (existing) {
      this.logger.warn(`Reward already exists for submission ${event.submissionId}, skipping`);
      return;
    }

    const reward = await this.rewardRepository.create({
      user: { connect: { id: event.userId } },
      campaign: { connect: { id: event.campaignId } },
      submission: { connect: { id: event.submissionId } },
      rewardType: 'CASH',
      amount: event.rewardAmount,
      status: 'APPROVED',
      approvedAt: new Date(),
    });

    const wallet = await this.walletRepository.getOrCreate(event.userId);
    await this.walletRepository.creditAvailable({
      walletId: wallet.id,
      amount: event.rewardAmount,
      type: 'CREDIT',
      referenceType: 'Reward',
      referenceId: reward.id,
      remarks: 'Task reward',
    });
    await this.rewardRepository.markCredited(reward.id);
    await this.merchantWalletRepository.spendCampaignBudget({
      campaignId: event.campaignId,
      amount: event.rewardAmount,
      rewardId: reward.id,
    });

    this.logger.log(`Credited ₹${event.rewardAmount} to user ${event.userId} for submission ${event.submissionId}`);

    this.eventEmitter.emit(
      'wallet.reward.credited',
      new RewardCreditedEvent(event.userId, reward.id, event.rewardAmount),
    );
  }
}
