import { Injectable } from '@nestjs/common';
import { AuditAction, UserStatus } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { ASSIGNABLE_STAFF_ROLES, AssignableStaffRole, roleClaimForSlug } from '../../auth/constants';
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

  /** The user's roles as the token names them, e.g. ['ADMIN', 'FINANCE_TEAM']. */
  async getRoles(userId: string): Promise<{ roles: string[] }> {
    await this.getById(userId);
    const slugs = await this.userAdminRepository.getRoleSlugs(userId);
    return { roles: slugs.map(roleClaimForSlug) };
  }

  /**
   * Gives a staff role (admin or finance team). Only super admins get here (see the controller). The person's next
   * token refresh picks the role up.
   */
  async grantRole(userId: string, role: string, adminId: string): Promise<{ roles: string[] }> {
    const { roleId, before } = await this.prepareRoleChange(userId, role);
    await this.userAdminRepository.grantRole(userId, roleId, adminId);
    return this.recordRoleChange(userId, adminId, before);
  }

  /** Removes a staff role, and signs the person out everywhere so it stops working straight away. */
  async revokeRole(userId: string, role: string, adminId: string): Promise<{ roles: string[] }> {
    const { roleId, before } = await this.prepareRoleChange(userId, role);
    await this.userAdminRepository.revokeRole(userId, roleId);
    await this.userAdminRepository.revokeSessions(userId);
    return this.recordRoleChange(userId, adminId, before);
  }

  private async prepareRoleChange(userId: string, role: string): Promise<{ roleId: string; before: string[] }> {
    if (!Object.prototype.hasOwnProperty.call(ASSIGNABLE_STAFF_ROLES, role)) {
      throw new BadRequestException(`Only these roles can be given here: ${Object.keys(ASSIGNABLE_STAFF_ROLES).join(', ')}`);
    }
    const before = (await this.getRoles(userId)).roles;
    const stored = await this.userAdminRepository.findRoleBySlug(ASSIGNABLE_STAFF_ROLES[role as AssignableStaffRole]);
    if (!stored) throw new NotFoundException('Role');
    return { roleId: stored.id, before };
  }

  private async recordRoleChange(userId: string, adminId: string, before: string[]): Promise<{ roles: string[] }> {
    const after = await this.getRoles(userId);
    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'User',
      entityId: userId,
      action: 'UPDATE',
      before: { roles: before },
      after: { roles: after.roles },
    });
    return after;
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

  /** Read-only referral tree, one level at a time: the user's direct referrals and the person who referred them. */
  async getReferrals(userId: string, page: number, limit: number) {
    await this.getById(userId);
    const [referrals, referrer] = await Promise.all([
      this.userAdminRepository.getReferrals(userId, page, limit),
      this.userAdminRepository.getReferrer(userId),
    ]);
    return { ...referrals, referrer };
  }
}
