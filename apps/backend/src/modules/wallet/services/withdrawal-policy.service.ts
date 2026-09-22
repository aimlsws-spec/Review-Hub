import { Injectable } from '@nestjs/common';
import { PayoutMode } from '@prisma/client';

import { BadRequestException } from '@common/exceptions/domain.exceptions';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { WITHDRAWAL_DEFAULTS } from '../constants';

const HOUR_MS = 60 * 60 * 1000;

/** The withdrawal rules as they stand now. Amounts are in rupees. */
export interface WithdrawalSettings {
  minimum: number;
  maximum: number;
  dailyLimit: number;
  /** `null` means no monthly limit. */
  monthlyLimit: number | null;
  bankCoolingHours: number;
  payoutMode: PayoutMode;
  tds: TdsSettings;
}

/** Tax kept back from payouts. A rate of 0 means none is. */
export interface TdsSettings {
  rate: number;
  /** Payouts in a financial year above this start to have tax kept back. */
  annualThreshold: number;
  section: string | null;
}

/** The parts of a bank account the cooling period looks at. */
export interface CoolingBank {
  createdAt: Date;
  detailsChangedAt: Date | null;
}

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

/**
 * The rules that decide whether a withdrawal may be requested, read from the platform configuration an admin edits.
 *
 * The daily and monthly totals are not checked here: they have to be checked while the wallet is locked, or two
 * requests made at the same moment could both pass. See WithdrawalSettlementRepository.request.
 */
@Injectable()
export class WithdrawalPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  /** The current rules. Falls back to the defaults when nobody has saved a configuration yet. */
  async getSettings(): Promise<WithdrawalSettings> {
    const config = await this.prisma.platformConfiguration.findFirst({ where: { deletedAt: null } });
    if (!config) {
      return {
        minimum: WITHDRAWAL_DEFAULTS.MINIMUM,
        maximum: WITHDRAWAL_DEFAULTS.MAXIMUM,
        dailyLimit: WITHDRAWAL_DEFAULTS.DAILY_LIMIT,
        monthlyLimit: WITHDRAWAL_DEFAULTS.MONTHLY_LIMIT,
        bankCoolingHours: WITHDRAWAL_DEFAULTS.BANK_COOLING_HOURS,
        payoutMode: WITHDRAWAL_DEFAULTS.PAYOUT_MODE,
        tds: { rate: 0, annualThreshold: 0, section: null },
      };
    }

    return {
      minimum: Number(config.minimumWithdrawal),
      maximum: Number(config.maximumWithdrawal),
      dailyLimit: Number(config.dailyWithdrawalLimit),
      monthlyLimit: config.monthlyWithdrawalLimit === null ? null : Number(config.monthlyWithdrawalLimit),
      bankCoolingHours: config.bankCoolingHours,
      payoutMode: config.payoutMode,
      tds: { rate: Number(config.tdsRate), annualThreshold: Number(config.tdsAnnualThreshold), section: config.tdsSection },
    };
  }

  /** The size of one request: not below the minimum, not above the most allowed at once. */
  assertAmountAllowed(settings: WithdrawalSettings, amount: number): void {
    if (amount < settings.minimum) {
      throw new BadRequestException(`Minimum withdrawal amount is ${rupees(settings.minimum)}`);
    }
    if (amount > settings.maximum) {
      throw new BadRequestException(`Maximum withdrawal amount is ${rupees(settings.maximum)} at a time`);
    }
  }

  /**
   * When a bank account may first receive a withdrawal, or `null` when there is no wait. The wait starts when the
   * account was added, or when its holder name, IFSC or bank last changed, whichever is later. Someone who has taken
   * over an account then has to wait before they can send money to a bank account of their own.
   */
  coolingEndsAt(bank: CoolingBank, coolingHours: number): Date | null {
    if (coolingHours <= 0) return null;
    const start = Math.max(bank.createdAt.getTime(), bank.detailsChangedAt?.getTime() ?? 0);
    return new Date(start + coolingHours * HOUR_MS);
  }

  assertBankReady(bank: CoolingBank, settings: WithdrawalSettings, now: Date = new Date()): void {
    const endsAt = this.coolingEndsAt(bank, settings.bankCoolingHours);
    if (!endsAt || endsAt.getTime() <= now.getTime()) return;

    const hoursLeft = Math.ceil((endsAt.getTime() - now.getTime()) / HOUR_MS);
    throw new BadRequestException(
      `This bank account was added or changed recently. For your security it can receive a withdrawal in about ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.`,
    );
  }
}
