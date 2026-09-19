import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentVerificationStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UserKycDocumentRepository } from '../../user-kyc/repositories/user-kyc-document.repository';

@Injectable()
export class KycManagementService {
  constructor(
    private readonly kycRepository: UserKycDocumentRepository,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  async listPending(page: number, limit: number) {
    const where = { verificationStatus: DocumentVerificationStatus.PENDING };
    const [data, total] = await Promise.all([
      this.prisma.userKycDocument.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.userKycDocument.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async approve(documentId: string, adminId: string) {
    const document = await this.kycRepository.findById(documentId);
    if (!document) throw new NotFoundException('KYC Document');
    if (document.verificationStatus === 'APPROVED') throw new BadRequestException('Already approved');

    const updated = await this.kycRepository.update(documentId, {
      verificationStatus: 'APPROVED',
      verifiedAt: new Date(),
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'UserKycDocument',
      entityId: documentId,
      action: 'APPROVE',
      before: { status: document.verificationStatus },
      after: { status: 'APPROVED' },
    });

    return updated;
  }

  async reject(documentId: string, adminId: string, reason: string) {
    const document = await this.kycRepository.findById(documentId);
    if (!document) throw new NotFoundException('KYC Document');
    if (document.verificationStatus === 'REJECTED') throw new BadRequestException('Already rejected');

    const updated = await this.kycRepository.update(documentId, {
      verificationStatus: 'REJECTED',
      rejectionReason: reason,
      verifiedAt: new Date(),
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'UserKycDocument',
      entityId: documentId,
      action: 'REJECT',
      before: { status: document.verificationStatus },
      after: { status: 'REJECTED', reason },
    });

    return updated;
  }
}
