import { Injectable } from '@nestjs/common';
import { MerchantBankAccount, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BankDetailsProtector } from '../../../shared/crypto';

/** A new account as the merchant typed it. The number and UPI ID are encrypted here, never by the caller. */
export interface NewMerchantBankAccount {
  merchantId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  upiId?: string;
  isPrimary: boolean;
}

/** What may change on an existing account. The number never does: a different number is a different account. */
export type MerchantBankAccountChanges = Omit<
  Prisma.MerchantBankAccountUpdateInput,
  'accountNumber' | 'accountNumberHash' | 'accountNumberLast4' | 'upiId'
> & { upiId?: string | null };

/**
 * Bank accounts come back masked ("XXXX1234") from every method except `findByMerchantIdRevealed`, which exists for
 * the admin's bank verification and nothing else.
 */
@Injectable()
export class MerchantBankRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protector: BankDetailsProtector,
  ) {}

  async findByMerchantId(merchantId: string) {
    return (await this.findRowsByMerchantId(merchantId)).map((row) => this.protector.mask(row));
  }

  /**
   * The real numbers, for an admin checking a merchant's bank details against the documents they uploaded. Never
   * use this for anything the merchant or another user sees.
   */
  async findByMerchantIdRevealed(merchantId: string) {
    return (await this.findRowsByMerchantId(merchantId)).map((row) => this.protector.reveal(row));
  }

  async findById(id: string) {
    return this.masked(await this.prisma.merchantBankAccount.findUnique({ where: { id } }));
  }

  async findPrimary(merchantId: string) {
    return this.masked(
      await this.prisma.merchantBankAccount.findFirst({ where: { merchantId, isPrimary: true, deletedAt: null } }),
    );
  }

  async countByMerchantId(merchantId: string) {
    return this.prisma.merchantBankAccount.count({ where: { merchantId, deletedAt: null } });
  }

  async create(input: NewMerchantBankAccount) {
    const { merchantId, accountNumber, upiId, ...rest } = input;
    const row = await this.prisma.merchantBankAccount.create({
      data: { ...rest, ...this.protector.seal({ accountNumber, upiId }), merchant: { connect: { id: merchantId } } },
    });
    return this.protector.mask(row);
  }

  async update(id: string, changes: MerchantBankAccountChanges) {
    const { upiId, ...rest } = changes;
    const data: Prisma.MerchantBankAccountUpdateInput = upiId === undefined ? rest : { ...rest, upiId: this.protector.sealUpi(upiId) };
    return this.protector.mask(await this.prisma.merchantBankAccount.update({ where: { id }, data }));
  }

  async softDelete(id: string) {
    return this.protector.mask(
      await this.prisma.merchantBankAccount.update({ where: { id }, data: { deletedAt: new Date() } }),
    );
  }

  async unsetPrimaryForMerchant(merchantId: string, excludeId?: string) {
    const where: Prisma.MerchantBankAccountWhereInput = { merchantId, isPrimary: true, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.merchantBankAccount.updateMany({
      where,
      data: { isPrimary: false },
    });
  }

  private findRowsByMerchantId(merchantId: string) {
    return this.prisma.merchantBankAccount.findMany({
      where: { merchantId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  private masked(row: MerchantBankAccount | null) {
    return row ? this.protector.mask(row) : null;
  }
}
