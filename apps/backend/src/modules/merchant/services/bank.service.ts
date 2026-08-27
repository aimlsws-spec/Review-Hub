import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { MERCHANT_CONSTANTS } from '../constants';
import { AddBankDto, UpdateBankDto } from '../dto';
import { MerchantBankAddedEvent } from '../events';
import { MerchantBankRepository, MerchantRepository } from '../repositories';

@Injectable()
export class BankService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly bankRepository: MerchantBankRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async addBankAccount(merchantId: string, dto: AddBankDto) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const bankCount = await this.bankRepository.countByMerchantId(merchantId);
    if (bankCount >= MERCHANT_CONSTANTS.MAX_BANK_ACCOUNTS) {
      throw new BadRequestException('Maximum bank accounts limit reached');
    }

    if (dto.isPrimary) {
      await this.bankRepository.unsetPrimaryForMerchant(merchantId);
    }

    const bankAccount = await this.bankRepository.create({
      merchant: { connect: { id: merchantId } },
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

    this.eventEmitter.emit('merchant.bank.added', new MerchantBankAddedEvent(
      merchantId, bankAccount.id, dto.bankName,
    ));

    return bankAccount;
  }

  async getBankAccounts(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');
    return this.bankRepository.findByMerchantId(merchantId);
  }

  async updateBankAccount(merchantId: string, bankId: string, dto: UpdateBankDto) {
    const bank = await this.bankRepository.findById(bankId);
    if (!bank || bank.merchantId !== merchantId) throw new NotFoundException('Bank account');

    if (dto.isPrimary) {
      await this.bankRepository.unsetPrimaryForMerchant(merchantId, bankId);
    }

    return this.bankRepository.update(bankId, dto);
  }

  async deleteBankAccount(merchantId: string, bankId: string) {
    const bank = await this.bankRepository.findById(bankId);
    if (!bank || bank.merchantId !== merchantId) throw new NotFoundException('Bank account');

    await this.bankRepository.softDelete(bankId);
    return { message: 'Bank account removed successfully' };
  }

  async setDefaultBankAccount(merchantId: string, bankId: string) {
    const bank = await this.bankRepository.findById(bankId);
    if (!bank || bank.merchantId !== merchantId) throw new NotFoundException('Bank account');

    await this.bankRepository.unsetPrimaryForMerchant(merchantId, bankId);
    return this.bankRepository.update(bankId, { isPrimary: true });
  }
}
