import { Injectable } from '@nestjs/common';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { WALLET_CONSTANTS } from '../constants';
import { AddUserBankDto, UpdateUserBankDto } from '../dto';
import { UserBankAccountRepository } from '../repositories';

@Injectable()
export class BankAccountService {
  constructor(private readonly bankRepository: UserBankAccountRepository) {}

  async addBankAccount(userId: string, dto: AddUserBankDto) {
    const bankCount = await this.bankRepository.countByUserId(userId);
    if (bankCount >= WALLET_CONSTANTS.MAX_BANK_ACCOUNTS) {
      throw new BadRequestException('Maximum bank accounts limit reached');
    }

    if (dto.isPrimary) {
      await this.bankRepository.unsetPrimaryForUser(userId);
    }

    const bankAccount = await this.bankRepository.create({
      user: { connect: { id: userId } },
      bankName: dto.bankName,
      accountHolderName: dto.accountHolderName,
      accountNumber: dto.accountNumber,
      ifscCode: dto.ifscCode,
      branch: dto.branch,
      upiId: dto.upiId,
      isPrimary: dto.isPrimary ?? bankCount === 0,
    });

    if (bankCount === 0) {
      await this.bankRepository.update(bankAccount.id, { isPrimary: true });
    }

    return bankAccount;
  }

  async getBankAccounts(userId: string) {
    return this.bankRepository.findByUserId(userId);
  }

  async updateBankAccount(userId: string, bankId: string, dto: UpdateUserBankDto) {
    const bank = await this.getOwned(userId, bankId);

    if (dto.isPrimary) {
      await this.bankRepository.unsetPrimaryForUser(userId, bankId);
    }

    // Changing who or where the money goes restarts the cooling period before a withdrawal can go to this account.
    // Making it the primary account does not: that changes nothing about where money would land.
    const changesDestination = (['accountHolderName', 'ifscCode', 'bankName'] as const).some(
      (field) => dto[field] !== undefined && dto[field] !== bank[field],
    );
    return this.bankRepository.update(bank.id, changesDestination ? { ...dto, detailsChangedAt: new Date() } : dto);
  }

  async deleteBankAccount(userId: string, bankId: string) {
    await this.getOwned(userId, bankId);
    await this.bankRepository.softDelete(bankId);
    return { message: 'Bank account removed successfully' };
  }

  private async getOwned(userId: string, bankId: string) {
    const bank = await this.bankRepository.findById(bankId);
    if (!bank || bank.userId !== userId) throw new NotFoundException('Bank account');
    return bank;
  }
}
