import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MerchantStatus, MerchantVerificationStatus } from '@prisma/client';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { ApproveMerchantDto, RejectMerchantDto, RequestDocumentsDto } from '../dto';
import { MerchantApprovedEvent, MerchantRejectedEvent } from '../events';
import { MerchantDocumentRepository, MerchantRepository } from '../repositories';

@Injectable()
export class AdminService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly documentRepository: MerchantDocumentRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  async approveMerchant(dto: ApproveMerchantDto, approvedBy: string) {
    const merchant = await this.merchantRepository.findById(dto.merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

    const updated = await this.merchantRepository.update(dto.merchantId, {
      status: 'ACTIVE' as MerchantStatus,
      // Not "VERIFIED" — that value doesn't exist in the MerchantVerificationStatus
      // enum and previously crashed this endpoint with a 500 at the database layer.
      verificationStatus: 'APPROVED' as MerchantVerificationStatus,
      verifiedAt: new Date(),
      verifiedBy: approvedBy,
    });

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
      after: { status: 'ACTIVE', verificationStatus: 'APPROVED' },
    });

    return updated;
  }

  async rejectMerchant(dto: RejectMerchantDto, rejectedBy: string) {
    const merchant = await this.merchantRepository.findById(dto.merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

    const updated = await this.merchantRepository.update(dto.merchantId, {
      status: 'SUSPENDED' as MerchantStatus,
      verificationStatus: 'REJECTED' as MerchantVerificationStatus,
    });

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
      after: { status: 'SUSPENDED', verificationStatus: 'REJECTED', reason: dto.reason },
    });

    return updated;
  }

  async requestDocuments(dto: RequestDocumentsDto) {
    const merchant = await this.merchantRepository.findById(dto.merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

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
    if (!merchant) throw new NotFoundException('Merchant not found');
    const documents = await this.documentRepository.findByMerchantId(merchantId);
    return { ...merchant, documents };
  }

  async toggleMerchantStatus(merchantId: string, status: MerchantStatus, actorId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
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
