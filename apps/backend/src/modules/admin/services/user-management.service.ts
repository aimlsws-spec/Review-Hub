import { Injectable } from '@nestjs/common';
import { AuditAction, UserStatus } from '@prisma/client';

import { NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { UpdateUserStatusDto, UserQueryDto } from '../dto';
import { UserAdminRepository } from '../repositories';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly userAdminRepository: UserAdminRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(query: UserQueryDto) {
    return this.userAdminRepository.findAll({
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
    });
  }

  async getById(userId: string) {
    const user = await this.userAdminRepository.findById(userId);
    if (!user) throw new NotFoundException('User');
    return user;
  }

  async suspend(userId: string, adminId: string, dto: UpdateUserStatusDto) {
    return this.changeStatus(userId, 'SUSPENDED', adminId, 'SUSPEND', dto.reason);
  }

  async ban(userId: string, adminId: string, dto: UpdateUserStatusDto) {
    return this.changeStatus(userId, 'BANNED', adminId, 'BAN', dto.reason);
  }

  async reactivate(userId: string, adminId: string) {
    return this.changeStatus(userId, 'ACTIVE', adminId, 'RESTORE');
  }

  private async changeStatus(
    userId: string,
    status: UserStatus,
    adminId: string,
    action: AuditAction,
    reason?: string,
  ) {
    const user = await this.getById(userId);
    const updated = await this.userAdminRepository.updateStatus(userId, status);

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'User',
      entityId: userId,
      action,
      before: { status: user.status },
      after: { status, reason },
    });

    return updated;
  }
}
