import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DocumentVerificationStatus, Prisma } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';
import { maskIdentifier } from '@common/utils';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UserKycReviewedEvent } from '../../user-kyc/events';
import { KycDocumentWithUser, UserKycDocumentRepository } from '../../user-kyc/repositories';
import { UserKycService } from '../../user-kyc/services';
import { KycReviewItemDto, KycReviewQueryDto } from '../dto';

/** Statuses in which a document is still waiting for a human decision. */
const AWAITING_DECISION: DocumentVerificationStatus[] = ['PENDING', 'UNDER_REVIEW'];

/**
 * Admin review of the identity documents users upload. Every decision is audit-logged and tells the
 * user, because an approved PAN is what unlocks withdrawals for them.
 */
@Injectable()
export class KycManagementService {
  private readonly logger = new Logger(KycManagementService.name);

  constructor(
    private readonly kycRepository: UserKycDocumentRepository,
    private readonly userKycService: UserKycService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Paginated review queue. Oldest first while waiting on a decision, so nothing sits unseen; newest first otherwise. */
  async list(query: KycReviewQueryDto) {
    const where = this.buildWhere(query);
    const oldestFirst = query.status !== undefined && AWAITING_DECISION.includes(query.status);

    const [documents, total] = await Promise.all([
      this.kycRepository.findManyForReview({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: oldestFirst ? 'asc' : 'desc' },
      }),
      this.kycRepository.countForReview(where),
    ]);

    return {
      data: documents.map((document) => this.toItem(document, false)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** A single document with its full number, for the reviewer to compare against the image. */
  async getById(documentId: string): Promise<KycReviewItemDto> {
    return this.toItem(await this.findOrFail(documentId), true);
  }

  async approve(documentId: string, adminId: string): Promise<KycReviewItemDto> {
    const previous = await this.decide(documentId, adminId, 'APPROVED');

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'UserKycDocument',
      entityId: documentId,
      action: 'APPROVE',
      before: { status: previous.status },
      after: { status: 'APPROVED' },
    });
    this.eventEmitter.emit('user.kyc.approved', new UserKycReviewedEvent(previous.userId, documentId, previous.documentType));
    this.logger.log(`Admin ${adminId} approved KYC document ${documentId}`);

    return this.getById(documentId);
  }

  async reject(documentId: string, adminId: string, reason: string): Promise<KycReviewItemDto> {
    const previous = await this.decide(documentId, adminId, 'REJECTED', reason);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'UserKycDocument',
      entityId: documentId,
      action: 'REJECT',
      before: { status: previous.status },
      after: { status: 'REJECTED', reason },
    });
    this.eventEmitter.emit('user.kyc.rejected', new UserKycReviewedEvent(previous.userId, documentId, previous.documentType, reason));
    this.logger.log(`Admin ${adminId} rejected KYC document ${documentId}`);

    return this.getById(documentId);
  }

  /** Resolves the stored file for an admin to view. Viewing identity documents is logged for accountability. */
  async getFilePath(documentId: string, adminId: string): Promise<string> {
    await this.findOrFail(documentId);
    this.logger.log(`Admin ${adminId} viewed KYC document ${documentId}`);
    return this.userKycService.getDocumentFilePathForReview(documentId);
  }

  private async findOrFail(documentId: string): Promise<KycDocumentWithUser> {
    const document = await this.kycRepository.findByIdForReview(documentId);
    if (!document) throw new NotFoundException('KYC document');
    return document;
  }

  /**
   * Moves a document out of its waiting state and returns what it was before. Fails if it was already
   * decided, including by another admin at the same moment.
   */
  private async decide(documentId: string, adminId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const document = await this.findOrFail(documentId);
    if (!AWAITING_DECISION.includes(document.verificationStatus)) {
      throw new BadRequestException('This document has already been reviewed');
    }

    const decided = await this.kycRepository.decideIfReviewable(documentId, {
      verificationStatus: status,
      verifiedBy: adminId,
      verifiedAt: new Date(),
      ...(reason ? { rejectionReason: reason } : {}),
    });
    if (!decided) throw new BadRequestException('This document has already been reviewed');

    return { userId: document.userId, documentType: document.documentType, status: document.verificationStatus };
  }

  private buildWhere(query: KycReviewQueryDto): Prisma.UserKycDocumentWhereInput {
    const where: Prisma.UserKycDocumentWhereInput = { deletedAt: null };
    if (query.status) where.verificationStatus = query.status;
    if (query.documentType) where.documentType = query.documentType;
    if (query.search) {
      where.OR = [
        { documentNumber: { contains: query.search } },
        {
          user: {
            is: {
              OR: [
                { firstName: { contains: query.search } },
                { lastName: { contains: query.search } },
                { email: { contains: query.search } },
                { phone: { contains: query.search } },
              ],
            },
          },
        },
      ];
    }
    return where;
  }

  private toItem(document: KycDocumentWithUser, revealNumber: boolean): KycReviewItemDto {
    const { user } = document;
    return {
      id: document.id,
      documentType: document.documentType,
      documentNumber:
        document.documentNumber && !revealNumber ? maskIdentifier(document.documentNumber) : document.documentNumber,
      status: document.verificationStatus,
      rejectionReason: document.rejectionReason,
      hasFile: Boolean(document.fileUploadId),
      submittedAt: document.createdAt,
      reviewedAt: document.verifiedAt,
      reviewedBy: document.verifiedBy,
      user: { id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email, phone: user.phone },
    };
  }
}
