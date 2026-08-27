import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupportTicket } from '@prisma/client';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { REPLYABLE_STATUSES, SUPPORT_EVENTS } from '../constants';
import { AddMessageDto, AssignTicketDto, CreateTicketDto, TicketQueryDto, UpdateTicketStatusDto } from '../dto';
import { SupportMessageRepository, SupportTicketRepository } from '../repositories';

@Injectable()
export class SupportService {
  constructor(
    private readonly ticketRepository: SupportTicketRepository,
    private readonly messageRepository: SupportMessageRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ── User-facing ──────────────────────────────────────────────────────────

  async createAsUser(userId: string, dto: CreateTicketDto) {
    return this.create({ user: { connect: { id: userId } } }, dto);
  }

  async listMineAsUser(userId: string, query: TicketQueryDto) {
    return this.ticketRepository.findByUser({ userId, page: query.page, limit: query.limit, status: query.status });
  }

  async getForUser(ticketId: string, userId: string) {
    return this.getOwned(ticketId, (t) => t.userId === userId);
  }

  async replyAsUser(ticketId: string, userId: string, dto: AddMessageDto) {
    const ticket = await this.getForUser(ticketId, userId);
    return this.addMessage(ticket, userId, 'USER', dto);
  }

  // ── Merchant-facing ──────────────────────────────────────────────────────

  async createAsMerchant(merchantId: string, dto: CreateTicketDto) {
    return this.create({ merchant: { connect: { id: merchantId } } }, dto);
  }

  async listMineAsMerchant(merchantId: string, query: TicketQueryDto) {
    return this.ticketRepository.findByMerchant({ merchantId, page: query.page, limit: query.limit, status: query.status });
  }

  async getForMerchant(ticketId: string, merchantId: string) {
    return this.getOwned(ticketId, (t) => t.merchantId === merchantId);
  }

  async replyAsMerchant(ticketId: string, merchantId: string, actorUserId: string, dto: AddMessageDto) {
    const ticket = await this.getForMerchant(ticketId, merchantId);
    return this.addMessage(ticket, actorUserId, 'MERCHANT', dto);
  }

  // ── Admin-facing ─────────────────────────────────────────────────────────

  async listAll(query: TicketQueryDto) {
    return this.ticketRepository.findAll({
      page: query.page,
      limit: query.limit,
      status: query.status,
      category: query.category,
      priority: query.priority,
    });
  }

  async getForAdmin(ticketId: string) {
    const ticket = await this.ticketRepository.findById(ticketId);
    if (!ticket) throw new NotFoundException('Support ticket');
    return ticket;
  }

  async replyAsAdmin(ticketId: string, adminId: string, dto: AddMessageDto) {
    const ticket = await this.getForAdmin(ticketId);
    if (!REPLYABLE_STATUSES.includes(ticket.status)) {
      throw new BadRequestException(`Cannot reply to a ${ticket.status.toLowerCase()} ticket`);
    }

    await this.messageRepository.create({
      ticket: { connect: { id: ticketId } },
      senderId: adminId,
      senderType: 'ADMIN',
      message: dto.message,
      internalNote: dto.internalNote ?? false,
    });

    // A staff reply (not an internal note) hands the conversation back to the ticket owner.
    const nextStatus = dto.internalNote ? ticket.status : 'WAITING_USER';
    const updated = await this.ticketRepository.update(ticketId, {
      status: nextStatus,
      assignedToId: ticket.assignedToId ?? adminId,
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SupportTicket',
      entityId: ticketId,
      action: 'UPDATE',
      after: { status: nextStatus, internalNote: dto.internalNote ?? false },
    });

    this.eventEmitter.emit(SUPPORT_EVENTS.MESSAGE_ADDED, { ticketId, senderType: 'ADMIN' });

    return updated;
  }

  async updateStatus(ticketId: string, adminId: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.getForAdmin(ticketId);

    const extra: Record<string, Date | null> = {};
    if (dto.status === 'RESOLVED') extra.resolvedAt = new Date();
    if (dto.status === 'CLOSED') extra.closedAt = new Date();
    if (dto.status !== 'RESOLVED' && dto.status !== 'CLOSED') {
      extra.resolvedAt = null;
      extra.closedAt = null;
    }

    const updated = await this.ticketRepository.update(ticketId, { status: dto.status, ...extra });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SupportTicket',
      entityId: ticketId,
      action: 'STATUS_CHANGE',
      before: { status: ticket.status },
      after: { status: dto.status },
    });

    this.eventEmitter.emit(SUPPORT_EVENTS.STATUS_CHANGED, { ticketId, from: ticket.status, to: dto.status });

    return updated;
  }

  async assign(ticketId: string, adminId: string, dto: AssignTicketDto) {
    await this.getForAdmin(ticketId);
    const updated = await this.ticketRepository.update(ticketId, {
      assignedToId: dto.assignedToId,
      status: 'ASSIGNED',
    });

    await this.auditLogService.record({
      actorId: adminId,
      actorType: 'ADMIN',
      entity: 'SupportTicket',
      entityId: ticketId,
      action: 'UPDATE',
      after: { assignedToId: dto.assignedToId },
    });

    return updated;
  }

  // ── Shared ───────────────────────────────────────────────────────────────

  private async create(owner: { user: { connect: { id: string } } } | { merchant: { connect: { id: string } } }, dto: CreateTicketDto) {
    const ticket = await this.ticketRepository.create({
      ...owner,
      subject: dto.subject,
      description: dto.description,
      category: dto.category,
      priority: dto.priority,
      status: 'OPEN',
    });

    this.eventEmitter.emit(SUPPORT_EVENTS.TICKET_CREATED, { ticketId: ticket.id });

    return ticket;
  }

  private async getOwned(ticketId: string, isOwner: (ticket: SupportTicket) => boolean) {
    const ticket = await this.ticketRepository.findById(ticketId);
    // Not found and "not yours" are reported identically so ids can't be used to probe other tickets.
    if (!ticket || !isOwner(ticket)) {
      throw new NotFoundException('Support ticket');
    }
    return ticket;
  }

  private async addMessage(ticket: SupportTicket, senderId: string, senderType: 'USER' | 'MERCHANT', dto: AddMessageDto) {
    if (!REPLYABLE_STATUSES.includes(ticket.status)) {
      throw new BadRequestException(`Cannot reply to a ${ticket.status.toLowerCase()} ticket`);
    }

    await this.messageRepository.create({
      ticket: { connect: { id: ticket.id } },
      senderId,
      senderType,
      message: dto.message,
      internalNote: false,
    });

    // If staff was waiting on the ticket owner, their reply moves it back into active review.
    const nextStatus = ticket.status === 'WAITING_USER' ? 'IN_PROGRESS' : ticket.status;
    const updated = await this.ticketRepository.update(ticket.id, { status: nextStatus });

    this.eventEmitter.emit(SUPPORT_EVENTS.MESSAGE_ADDED, { ticketId: ticket.id, senderType });

    return updated;
  }
}
