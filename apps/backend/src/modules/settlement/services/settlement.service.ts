import { Injectable, Logger } from '@nestjs/common';

import { SettlementRepository } from '../repositories';

import { InvoiceService } from './invoice.service';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly settlementRepository: SettlementRepository,
    private readonly invoiceService: InvoiceService,
  ) {}

  /** Generates a settlement + invoice for every merchant with wallet activity in the period. Safe to re-run — both steps are idempotent. */
  async generateForPeriod(periodStart: Date, periodEnd: Date) {
    const merchantIds = await this.settlementRepository.findMerchantIdsActiveInPeriod(periodStart, periodEnd);
    const settlements = [];

    for (const merchantId of merchantIds) {
      const settlement = await this.settlementRepository.generateForMerchant({ merchantId, periodStart, periodEnd });
      if (!settlement) continue;

      await this.invoiceService.generateForSettlement(settlement.id);
      settlements.push(settlement);
    }

    this.logger.log(`Generated ${settlements.length} settlement(s) for ${periodStart.toISOString()} – ${periodEnd.toISOString()}`);
    return settlements;
  }

  /** What the nightly job runs: the prior full UTC day. */
  async generateForPreviousDay() {
    const now = new Date();
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);
    return this.generateForPeriod(periodStart, periodEnd);
  }

  async listForMerchant(merchantId: string, page: number, limit: number) {
    return this.settlementRepository.findByMerchant(merchantId, page, limit);
  }
}
