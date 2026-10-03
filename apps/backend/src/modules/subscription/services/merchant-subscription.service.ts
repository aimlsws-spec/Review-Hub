import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ERROR_CODES } from '@common/constants';
import { AppException } from '@common/exceptions/app.exception';
import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { NotificationQueueService } from '../../notification/services';
import { InvoiceService } from '../../settlement/services';
import { addOneMonth, featuredUntilAfter, withGst } from '../billing';
import { SUBSCRIPTION_GRACE_DAYS } from '../constants';
import { MerchantSubscriptionRepository, SubscriptionPlanRepository } from '../repositories';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Subscriptions and featured campaigns, paid from the merchant wallet (never through a payment gateway). Each charge
 * adds GST and gets a tax invoice. Plans are offered only once an admin switches them on.
 */
@Injectable()
export class MerchantSubscriptionService {
  private readonly logger = new Logger(MerchantSubscriptionService.name);

  constructor(
    private readonly subscriptionRepository: MerchantSubscriptionRepository,
    private readonly planRepository: SubscriptionPlanRepository,
    private readonly invoiceService: InvoiceService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly config: ConfigService,
  ) {}

  private get gstRate(): number {
    return this.config.get<number>('platform.gstRatePercent', 18);
  }

  /** The merchant's current subscription, the plans on offer, and what featuring a campaign costs. */
  async getOverview(merchantId: string) {
    const [current, plans, featured] = await Promise.all([
      this.subscriptionRepository.findCurrent(merchantId),
      this.planRepository.findActive(),
      this.subscriptionRepository.featuredPrice(),
    ]);
    return {
      current,
      plans: plans.map((plan) => ({ ...plan, priceWithGst: withGst(Number(plan.monthlyPrice), this.gstRate).totalAmount })),
      featured: { ...featured, priceWithGst: withGst(featured.price, this.gstRate).totalAmount },
    };
  }

  /** Starts a plan now, paying its first month. A merchant has one subscription at a time. */
  async subscribe(merchantId: string, planId: string, now: Date = new Date()) {
    const plan = await this.planRepository.findById(planId);
    if (!plan || !plan.isActive) throw new NotFoundException('Subscription plan');
    const current = await this.subscriptionRepository.findCurrent(merchantId);
    if (current) {
      throw new BadRequestException(
        `You are on the ${current.plan.name} plan until ${current.periodEnd.toDateString()}. Cancel it and choose a new plan once it ends.`,
      );
    }

    const periodEnd = addOneMonth(now);
    const { chargeId, result } = await this.subscriptionRepository.charge(
      {
        merchantId,
        type: 'SUBSCRIPTION',
        periodStart: now,
        periodEnd,
        amounts: withGst(Number(plan.monthlyPrice), this.gstRate),
        remarks: `${plan.name} plan, first month`,
      },
      async (tx, newChargeId) => {
        const subscription = await tx.merchantSubscription.create({
          data: { merchant: { connect: { id: merchantId } }, plan: { connect: { id: plan.id } }, periodStart: now, periodEnd },
        });
        // The charge is made before the subscription exists, so it is linked to it here, in the same transaction.
        if (newChargeId) await tx.merchantServiceCharge.update({ where: { id: newChargeId }, data: { subscriptionId: subscription.id } });
        return subscription;
      },
    );
    if (chargeId) await this.invoice(chargeId);
    this.logger.log(`Merchant ${merchantId} subscribed to ${plan.code}`);
    return result;
  }

  /** Stops renewal. The plan keeps working until the end of the month already paid for. */
  async cancel(merchantId: string) {
    const current = await this.requireCurrent(merchantId);
    return this.subscriptionRepository.update(current.id, { autoRenew: false, cancelledAt: new Date() });
  }

  /** Undoes a cancellation before the period ends. */
  async resume(merchantId: string) {
    const current = await this.requireCurrent(merchantId);
    return this.subscriptionRepository.update(current.id, { autoRenew: true, cancelledAt: null });
  }

  /**
   * Puts an active campaign at the top of the listings for the configured number of days, or adds those days to a
   * feature still running. Free while the merchant's plan has a featured slot left; otherwise paid from the wallet.
   */
  async featureCampaign(merchantId: string, campaignId: string, now: Date = new Date()) {
    const campaign = await this.subscriptionRepository.findCampaignForMerchant(merchantId, campaignId);
    if (!campaign) throw new NotFoundException('Campaign');
    if (campaign.status !== 'ACTIVE') throw new BadRequestException('Only a running campaign can be featured');

    const [{ price, days }, current, featuredNow] = await Promise.all([
      this.subscriptionRepository.featuredPrice(),
      this.subscriptionRepository.findCurrent(merchantId),
      this.subscriptionRepository.countFeaturedNow(merchantId, now, campaignId),
    ]);
    const includedInPlan = current?.status === 'ACTIVE' && featuredNow < current.plan.featuredSlots;
    const featuredUntil = featuredUntilAfter(campaign.featuredUntil, now, days);

    const { chargeId, result } = await this.subscriptionRepository.charge(
      {
        merchantId,
        type: 'FEATURED_CAMPAIGN',
        campaignId,
        periodStart: now,
        periodEnd: featuredUntil,
        amounts: withGst(includedInPlan ? 0 : price, this.gstRate),
        remarks: `Featured campaign "${campaign.title}" for ${days} days`,
      },
      (tx) => tx.campaign.update({ where: { id: campaignId }, data: { featured: true, featuredUntil }, select: { id: true, featured: true, featuredUntil: true } }),
    );
    if (chargeId) await this.invoice(chargeId);
    return { ...result, includedInPlan };
  }

  /**
   * Renews every subscription whose period has ended: charges the next month and moves the period on. One whose
   * renewal can not be paid becomes PAST_DUE and is tried again each run for SUBSCRIPTION_GRACE_DAYS, then expires;
   * a cancelled one simply expires. Safe to run twice: a period is charged at most once (unique per period).
   */
  async renewDue(now: Date = new Date()): Promise<{ renewed: number; pastDue: number; expired: number }> {
    const due = await this.subscriptionRepository.findDueForRenewal(now);
    const counts = { renewed: 0, pastDue: 0, expired: 0 };

    for (const subscription of due) {
      const graceOver = now.getTime() - subscription.periodEnd.getTime() > SUBSCRIPTION_GRACE_DAYS * DAY_MS;
      if (!subscription.autoRenew || subscription.plan.deletedAt || graceOver) {
        await this.subscriptionRepository.update(subscription.id, { status: 'EXPIRED' });
        await this.tell(subscription.merchant.userId, 'Your plan has ended', `Your ${subscription.plan.name} plan has ended.`);
        counts.expired += 1;
        continue;
      }

      const periodStart = subscription.periodEnd;
      const periodEnd = addOneMonth(periodStart);
      try {
        const { chargeId } = await this.subscriptionRepository.charge(
          {
            merchantId: subscription.merchantId,
            type: 'SUBSCRIPTION',
            subscriptionId: subscription.id,
            periodStart,
            periodEnd,
            amounts: withGst(Number(subscription.plan.monthlyPrice), this.gstRate),
            remarks: `${subscription.plan.name} plan renewal`,
          },
          (tx) => tx.merchantSubscription.update({ where: { id: subscription.id }, data: { status: 'ACTIVE', periodStart, periodEnd } }),
        );
        if (chargeId) await this.invoice(chargeId);
        counts.renewed += 1;
      } catch (error) {
        if (!(error instanceof AppException) || error.code !== ERROR_CODES.INSUFFICIENT_BALANCE) throw error;
        if (subscription.status !== 'PAST_DUE') {
          await this.subscriptionRepository.update(subscription.id, { status: 'PAST_DUE' });
          await this.tell(
            subscription.merchant.userId,
            'Your plan could not be renewed',
            `There is not enough in your wallet to renew the ${subscription.plan.name} plan. Top up within ${SUBSCRIPTION_GRACE_DAYS} days to keep it.`,
          );
        }
        counts.pastDue += 1;
      }
    }
    if (due.length > 0) this.logger.log(`Subscription renewals: ${JSON.stringify(counts)}`);
    return counts;
  }

  /** Featured campaigns whose time is up go back among the rest. */
  async expireFeaturedCampaigns(now: Date = new Date()): Promise<{ unfeatured: number }> {
    return { unfeatured: await this.subscriptionRepository.clearExpiredFeatures(now) };
  }

  private async requireCurrent(merchantId: string) {
    const current = await this.subscriptionRepository.findCurrent(merchantId);
    if (!current) throw new NotFoundException('Subscription');
    return current;
  }

  /** The money has moved; an invoice that fails to render is logged and can be issued again, never undoing the charge. */
  private async invoice(chargeId: string) {
    try {
      await this.invoiceService.generateForServiceCharge(chargeId);
    } catch (error) {
      this.logger.error(`Invoice for service charge ${chargeId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async tell(userId: string, title: string, message: string) {
    await this.notificationQueue.enqueue({ userId, type: 'SYSTEM', title, message, channels: ['IN_APP', 'EMAIL'] });
  }
}
