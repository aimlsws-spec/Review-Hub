import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantStatus, MerchantVerificationStatus } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { ApproveMerchantDto, RejectMerchantDto, RequestDocumentsDto } from '../dto';
import { MerchantApprovedEvent, MerchantRejectedEvent } from '../events';
import { MerchantDocumentRepository, MerchantRepository, MerchantBankRepository } from '../repositories';
import { merchantVerificationLevel } from '../verification-level';

@Injectable()
export class AdminService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly documentRepository: MerchantDocumentRepository,
    private readonly bankRepository: MerchantBankRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  async approveMerchant(dto: ApproveMerchantDto, approvedBy: string) {
    const merchant = await this.merchantRepository.findById(dto.merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const { merchant: updated, documentsApproved, bankAccountsVerified } =
      await this.merchantRepository.approveWithDetails(dto.merchantId, approvedBy);

    this.eventEmitter.emit('merchant.approved', new MerchantApprovedEvent(
      dto.merchantId, merchant.businessName, merchant.email, approvedBy,
    ));

    await this.auditLogService.record({
      actorId: approvedBy,
      actorType: 'ADMIN',
      entity: 'Merchant',
      entityId: dto.merchantId,
      action: 'APPROVE',
      before: { status: merchant.status, verificationStatus: merchant.verificationStatus },
      after: { status: 'ACTIVE', verificationStatus: 'APPROVED', documentsApproved, bankAccountsVerified },
    });

    return updated;
  }

  async rejectMerchant(dto: RejectMerchantDto, rejectedBy: string) {
    const merchant = await this.merchantRepository.findById(dto.merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    const { merchant: updated, documentsRejected } =
      await this.merchantRepository.rejectWithDocuments(dto.merchantId, dto.reason);

    this.eventEmitter.emit('merchant.rejected', new MerchantRejectedEvent(
      dto.merchantId, merchant.businessName, merchant.email, dto.reason,
    ));

    await this.auditLogService.record({
      actorId: rejectedBy,
      actorType: 'ADMIN',
      entity: 'Merchant',
      entityId: dto.merchantId,
      action: 'REJECT',
      before: { status: merchant.status, verificationStatus: merchant.verificationStatus },
      after: { status: 'SUSPENDED', verificationStatus: 'REJECTED', reason: dto.reason, documentsRejected },
    });

    return updated;
  }

  async requestDocuments(dto: RequestDocumentsDto) {
    const merchant = await this.merchantRepository.findById(dto.merchantId);
    if (!merchant) throw new NotFoundException('Merchant');

    return this.merchantRepository.update(dto.merchantId, {
      verificationStatus: 'UNDER_REVIEW' as MerchantVerificationStatus,
    });
  }

  async listPendingMerchants() {
    return this.merchantRepository.findPending();
  }

  async listAllMerchants(page = 1, limit = 20, status?: string, search?: string) {
    return this.merchantRepository.findWithFilters({ page, limit, status, search });
  }

  async getMerchantDetail(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');
    const documents = await this.documentRepository.findByMerchantId(merchantId);
    // Revealed, not masked: the admin checks these against the merchant's uploaded documents before approving.
    const bankAccounts = await this.bankRepository.findByMerchantIdRevealed(merchantId);
    const facts = await this.merchantRepository.findVerificationFacts(merchantId);
    const verificationLevel = facts ? merchantVerificationLevel(facts) : 0;
    return { ...merchant, documents, bankAccounts, verificationLevel };
  }

  async toggleMerchantStatus(merchantId: string, status: MerchantStatus, actorId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant');
    const updated = await this.merchantRepository.update(merchantId, { status });

    await this.auditLogService.record({
      actorId,
      actorType: 'ADMIN',
      entity: 'Merchant',
      entityId: merchantId,
      action: 'STATUS_CHANGE',
      before: { status: merchant.status },
      after: { status },
    });

    return updated;
  }
}
