import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { MERCHANT_CONSTANTS } from '../constants';
import { InviteTeamDto, UpdateTeamDto } from '../dto';
import { MerchantTeamInvitedEvent } from '../events';
import { MerchantInvitationRepository, MerchantRepository, MerchantTeamRepository } from '../repositories';

@Injectable()
export class TeamService {
  constructor(
    private readonly merchantRepository: MerchantRepository,
    private readonly teamRepository: MerchantTeamRepository,
    private readonly invitationRepository: MerchantInvitationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async invite(merchantId: string, currentUserId: string, dto: InviteTeamDto) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');

    const currentMember = await this.teamRepository.findByMerchantAndUser(merchantId, currentUserId);
    if (!currentMember || (currentMember.role !== 'ADMIN' && currentMember.role !== 'OWNER')) {
      throw new ForbiddenException('Only merchant owners and admins can invite team members');
    }

    const memberCount = await this.teamRepository.countByMerchantId(merchantId);
    if (memberCount >= MERCHANT_CONSTANTS.MAX_TEAM_MEMBERS) {
      throw new BadRequestException('Maximum team members reached');
    }

    const existingInvite = await this.invitationRepository.findPendingByMerchantAndEmail(merchantId, dto.email);
    if (existingInvite) {
      throw new ConflictException('Pending invitation already exists for this email');
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + MERCHANT_CONSTANTS.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const invitation = await this.invitationRepository.create({
      merchant: { connect: { id: merchantId } },
      email: dto.email,
      role: dto.role,
      inviteToken: token,
      expiresAt,
      invitedBy: currentUserId,
      status: 'PENDING' as InvitationStatus,
    });

    this.eventEmitter.emit('merchant.team.invited', new MerchantTeamInvitedEvent(
      merchantId, dto.email, dto.role, token,
    ));

    return invitation;
  }

  async acceptInvitation(token: string, userId: string, userEmail: string) {
    const invitation = await this.invitationRepository.findByToken(token);
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'PENDING') throw new BadRequestException('Invitation already processed');
    if (invitation.email !== userEmail) throw new BadRequestException('This invitation was sent to a different email');
    if (invitation.expiresAt < new Date()) {
      await this.invitationRepository.update(invitation.id, { status: 'EXPIRED' });
      throw new BadRequestException('Invitation has expired');
    }

    const existingMember = await this.teamRepository.findByMerchantAndUser(invitation.merchantId, userId);
    if (existingMember) {
      throw new ConflictException('You are already a member of this merchant team');
    }

    await this.teamRepository.create({
      merchant: { connect: { id: invitation.merchantId } },
      user: { connect: { id: userId } },
      role: invitation.role,
      status: 'ACTIVE',
    });

    await this.invitationRepository.update(invitation.id, { status: 'ACCEPTED' as InvitationStatus });

    return { message: 'Invitation accepted successfully' };
  }

  async getTeamMembers(merchantId: string) {
    const merchant = await this.merchantRepository.findById(merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    return this.teamRepository.findByMerchantId(merchantId);
  }

  async updateTeamMember(merchantId: string, memberId: string, dto: UpdateTeamDto) {
    const member = await this.teamRepository.findById(memberId);
    if (!member || member.merchantId !== merchantId) throw new NotFoundException('Team member not found');

    const updated = await this.teamRepository.update(memberId, { role: dto.role, permissions: dto.permissions });

    this.eventEmitter.emit('merchant.team.member_updated', { merchantId, memberId, role: dto.role });

    return updated;
  }

  async removeTeamMember(merchantId: string, memberId: string) {
    const member = await this.teamRepository.findById(memberId);
    if (!member || member.merchantId !== merchantId) throw new NotFoundException('Team member not found');

    const merchant = await this.merchantRepository.findById(merchantId);
    if (merchant?.userId === member.userId) {
      throw new BadRequestException('Cannot remove the merchant owner from the team');
    }

    await this.teamRepository.softDelete(memberId);

    this.eventEmitter.emit('merchant.team.member_removed', { merchantId, memberId });

    return { message: 'Team member removed successfully' };
  }

  async getInvitations(merchantId: string) {
    return this.invitationRepository.findByMerchantId(merchantId);
  }

  async cancelInvitation(merchantId: string, invitationId: string) {
    const allInvites = await this.invitationRepository.findByMerchantId(merchantId);
    const invite = allInvites.find(i => i.id === invitationId);
    if (!invite) throw new NotFoundException('Invitation not found');

    await this.invitationRepository.softDelete(invite.id);
    return { message: 'Invitation cancelled' };
  }
}
