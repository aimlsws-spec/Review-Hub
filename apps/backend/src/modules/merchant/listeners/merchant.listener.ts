import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { EmailQueueService } from '../../../mail/email-queue.service';
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
        subject: 'Merchant Registration Successful',
        text: `Your merchant account "${event.businessName}" has been registered successfully. Please complete your KYC to start using our services.`,
        html: `<p>Your merchant account "<strong>${event.businessName}</strong>" has been registered successfully. Please complete your KYC to start using our services.</p>`,
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
        subject: 'Merchant Account Approved',
        text: `Congratulations! Your merchant account "${event.businessName}" has been approved.`,
        html: `<p>Congratulations! Your merchant account "<strong>${event.businessName}</strong>" has been approved.</p>`,
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
        subject: 'Merchant Account Verification Update',
        text: `Your merchant account "${event.businessName}" verification could not be completed.\n\nReason: ${event.reason}`,
        html: `<p>Your merchant account "<strong>${event.businessName}</strong>" verification could not be completed.</p><p>Reason: ${event.reason}</p>`,
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
      const inviteUrl = `${process.env.FRONTEND_URL || 'https://app.reviewhub.com'}/accept-invite?token=${event.inviteToken}`;
      await this.emailQueueService.enqueue({
        to: event.email,
        subject: 'You have been invited to join a merchant team',
        text: `You have been invited to join a merchant team as ${event.role}.\n\nClick here to accept: ${inviteUrl}`,
        html: `<p>You have been invited to join a merchant team as <strong>${event.role}</strong>.</p><p><a href="${inviteUrl}">Click here to accept</a></p>`,
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue invitation email to ${event.email}:`, (error as Error).message);
    }
  }
}
