import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantStatus, MerchantVerificationStatus } from '@prisma/client';

import { RegisterMerchantDto, UpdateMerchantDto } from '../dto';
import { MerchantRegisteredEvent } from '../events';
import {
  MerchantDocumentRepository,
  MerchantRepository,
  MerchantTeamRepository,
} from '../repositories';

@Injectable()
export class MerchantService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly documentRepository: MerchantDocumentRepository,
    private readonly teamRepository: MerchantTeamRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(userId: string, dto: RegisterMerchantDto) {
    const existing = await this.merchantRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Merchant with this email already exists');

    if (dto.gstNumber) {
      const gstExists = await this.merchantRepository.findByGst(dto.gstNumber);
      if (gstExists) throw new ConflictException('GST number already registered');
    }

    if (dto.panNumber) {
      const panExists = await this.merchantRepository.findByPan(dto.panNumber);
      if (panExists) throw new ConflictException('PAN number already registered');
    }

    const merchant = await this.merchantRepository.create({
      user: { connect: { id: userId } },
      businessName: dto.businessName,
      legalBusinessName: dto.legalBusinessName,
      businessType: dto.businessType,
      businessCategory: dto.businessCategory,
      gstNumber: dto.gstNumber,
      panNumber: dto.panNumber,
      registrationNumber: dto.registrationNumber,
      website: dto.website,
      email: dto.email,
      phone: dto.phone,
      addressLine1: dto.addressLine1,
      addressLine2: dto.addressLine2,
      country: dto.countryId ? { connect: { id: dto.countryId } } : undefined,
      state: dto.stateId ? { connect: { id: dto.stateId } } : undefined,
      city: dto.cityId ? { connect: { id: dto.cityId } } : undefined,
      postalCode: dto.postalCode,
      description: dto.description,
      status: 'ACTIVE' as MerchantStatus,
      verificationStatus: 'NOT_SUBMITTED' as MerchantVerificationStatus,
    });

    // Team-management (invite/role/remove) is gated on a merchant_team row, not
    // merchants.userId, so the owner needs one too or they can never invite anyone.
    await this.teamRepository.create({
      merchant: { connect: { id: merchant.id } },
      user: { connect: { id: userId } },
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    this.eventEmitter.emit('merchant.registered', new MerchantRegisteredEvent(
      merchant.id, userId, dto.email, dto.businessName,
    ));

    return this.merchantRepository.findById(merchant.id);
  }

  async getProfile(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  /** Distinct from getProfile() — the `/merchants/me` route resolves the merchant from the JWT's user id, not a merchant id. */
  async getProfileByUserId(userId: string) {
    const merchant = await this.merchantRepository.findByUserId(userId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async updateProfile(merchantId: string, dto: UpdateMerchantDto) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

    const updated = await this.merchantRepository.update(merchantId, dto);

    this.eventEmitter.emit('merchant.updated', {
      merchantId,
      changes: dto as unknown as Record<string, unknown>,
    });

    return updated;
  }

  async getVerificationStatus(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    return {
      status: merchant.status,
      verificationStatus: merchant.verificationStatus,
      documents: await this.documentRepository.findByMerchantId(merchantId),
    };
  }
}
