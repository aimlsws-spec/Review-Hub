import { Logger, Module } from '@nestjs/common';

import { AccountLinkageRepository, DuplicateImageRepository, SubmissionSignalRepository } from './repositories';
import {
  AccountLinkageService,
  AccountRiskService,
  DuplicateImageService,
  IpReputationService,
  SubmissionRiskService,
} from './services';

/**
 * Fraud signals that cut across features: near-duplicate evidence images, IP reputation, and links between
 * accounts. A leaf module: it depends only on the database and config, so Task, AI, Wallet, Auth, Referral
 * and Admin can all use it without creating an import cycle.
 */
@Module({
  providers: [
    DuplicateImageRepository,
    SubmissionSignalRepository,
    AccountLinkageRepository,
    DuplicateImageService,
    IpReputationService,
    AccountLinkageService,
    AccountRiskService,
    SubmissionRiskService,
  ],
  exports: [
    DuplicateImageService,
    SubmissionSignalRepository,
    IpReputationService,
    AccountLinkageService,
    AccountRiskService,
    SubmissionRiskService,
  ],
})
export class RiskModule {
  private readonly logger = new Logger(RiskModule.name);

  constructor() {
    this.logger.log('RiskModule initialized');
  }
}
