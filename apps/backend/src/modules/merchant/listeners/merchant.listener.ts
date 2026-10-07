import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EmailQueueService } from '../../../mail/email-queue.service';
import {
  buildMerchantApprovedEmail,
  buildMerchantRegisteredEmail,
  buildMerchantRejectedEmail,
  buildTeamInviteEmail,
} from '../emails/merchant-emails';
import {
  MerchantApprovedEvent,
  MerchantKycUploadedEvent,
  MerchantRejectedEvent,
  MerchantRegisteredEvent,
  MerchantTeamInvitedEvent,
} from '../events';

@Injectable()
export class MerchantListener {
  private readonly logger = new Logger(MerchantListener.name);

  constructor(private readonly emailQueueService: EmailQueueService) {}

  @OnEvent('merchant.registered')
  async handleMerchantRegistered(event: MerchantRegisteredEvent) {
    this.logger.log(`Merchant registered: ${event.businessName} (${event.merchantId})`);
    try {
      await this.emailQueueService.enqueue({
        to: event.email,
        ...buildMerchantRegisteredEmail(event.businessName),
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue registration email to ${event.email}:`, (error as Error).message);
    }
  }

  @OnEvent('merchant.approved')
  async handleMerchantApproved(event: MerchantApprovedEvent) {
    this.logger.log(`Merchant approved: ${event.businessName}`);
    try {
      await this.emailQueueService.enqueue({
        to: event.email,
        ...buildMerchantApprovedEmail(event.businessName),
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue approval email:`, (error as Error).message);
    }
  }

  @OnEvent('merchant.rejected')
  async handleMerchantRejected(event: MerchantRejectedEvent) {
    this.logger.log(`Merchant rejected: ${event.businessName}`);
    try {
      await this.emailQueueService.enqueue({
        to: event.email,
        ...buildMerchantRejectedEmail(event.businessName, event.reason),
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue rejection email:`, (error as Error).message);
    }
  }

  @OnEvent('merchant.kyc.uploaded')
  async handleKycUploaded(event: MerchantKycUploadedEvent) {
    this.logger.log(`KYC document uploaded for merchant ${event.merchantId}: ${event.documentType}`);
  }

  @OnEvent('merchant.team.invited')
  async handleTeamInvited(event: MerchantTeamInvitedEvent) {
    this.logger.log(`Team invitation sent to ${event.email} for merchant ${event.merchantId}`);
    try {
      const inviteUrl = `${process.env.FRONTEND_URL || 'https://app.viralkar.com'}/accept-invite?token=${event.inviteToken}`;
      await this.emailQueueService.enqueue({
        to: event.email,
        ...buildTeamInviteEmail(event.role, inviteUrl),
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue invitation email to ${event.email}:`, (error as Error).message);
    }
  }
}
