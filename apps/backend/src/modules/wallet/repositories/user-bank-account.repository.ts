import { Injectable } from '@nestjs/common';
import { Prisma, UserBankAccount } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { BankDetailsProtector } from '../../../shared/crypto';

/** A new account as the person typed it. The number and UPI ID are encrypted here, never by the caller. */
export interface NewUserBankAccount {
  userId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  upiId?: string;
  isPrimary: boolean;
}

/** What may change on an existing account. The number never does: a different number is a different account. */
export type UserBankAccountChanges = Omit<Prisma.UserBankAccountUpdateInput, 'accountNumber' | 'accountNumberHash' | 'accountNumberLast4' | 'upiId'> & {
  upiId?: string | null;
};

/**
 * Bank accounts come back masked ("XXXX1234") from every method: nothing read here can leak a full number into a
 * response by mistake. Code that pays out reads the real number through the withdrawal or refund repositories.
 */
@Injectable()
export class UserBankAccountRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly protector: BankDetailsProtector,
  ) {}

  async findByUserId(userId: string) {
    const rows = await this.prisma.userBankAccount.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.protector.mask(row));
  }

  async findById(id: string) {
    return this.masked(await this.prisma.userBankAccount.findUnique({ where: { id } }));
  }

  async countByUserId(userId: string) {
    return this.prisma.userBankAccount.count({ where: { userId, deletedAt: null } });
  }

  async create(input: NewUserBankAccount) {
    const { userId, accountNumber, upiId, ...rest } = input;
    const row = await this.prisma.userBankAccount.create({
      data: { ...rest, ...this.protector.seal({ accountNumber, upiId }), user: { connect: { id: userId } } },
    });
    return this.protector.mask(row);
  }

  async update(id: string, changes: UserBankAccountChanges) {
    const { upiId, ...rest } = changes;
    const data: Prisma.UserBankAccountUpdateInput = upiId === undefined ? rest : { ...rest, upiId: this.protector.sealUpi(upiId) };
    return this.protector.mask(await this.prisma.userBankAccount.update({ where: { id }, data }));
  }

  async softDelete(id: string) {
    return this.protector.mask(await this.prisma.userBankAccount.update({ where: { id }, data: { deletedAt: new Date() } }));
  }

  async unsetPrimaryForUser(userId: string, excludeId?: string) {
    const where: Prisma.UserBankAccountWhereInput = { userId, isPrimary: true, deletedAt: null };
    if (excludeId) where.id = { not: excludeId };
    return this.prisma.userBankAccount.updateMany({ where, data: { isPrimary: false } });
  }

  private masked(row: UserBankAccount | null) {
    return row ? this.protector.mask(row) : null;
  }
}
