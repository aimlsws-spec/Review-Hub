import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { SupportMessageRepository, SupportTicketRepository } from '../repositories';

import { SupportService } from './support.service';

describe('SupportService', () => {
  let service: SupportService;

  const mockTicketRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByUser: jest.fn(),
    findByMerchant: jest.fn(),
    findAll: jest.fn(),
  };
  const mockMessageRepository = { create: jest.fn() };
  const mockEventEmitter = { emit: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  const openTicket = { id: 'ticket-1', userId: 'user-1', merchantId: null, status: 'OPEN', assignedToId: null };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: SupportTicketRepository, useValue: mockTicketRepository },
        { provide: SupportMessageRepository, useValue: mockMessageRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    jest.clearAllMocks();
  });

  describe('createAsUser', () => {
    it('should create a ticket owned by the user with status OPEN', async () => {
      mockTicketRepository.create.mockResolvedValue({ id: 'ticket-1' });

      await service.createAsUser('user-1', { subject: 'Help', description: 'Something is broken' });
      expect(mockTicketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ user: { connect: { id: 'user-1' } }, status: 'OPEN' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('support.ticket.created', { ticketId: 'ticket-1' });
    });
  });

  describe('createAsMerchant', () => {
    it('should create a ticket owned by the merchant', async () => {
      mockTicketRepository.create.mockResolvedValue({ id: 'ticket-1' });

      await service.createAsMerchant('merchant-1', { subject: 'Help', description: 'Payout question' });
      expect(mockTicketRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ merchant: { connect: { id: 'merchant-1' } } }),
      );
    });
  });

  describe('getForUser', () => {
    it('should return the ticket when owned by the user', async () => {
      mockTicketRepository.findById.mockResolvedValue(openTicket);

      const result = await service.getForUser('ticket-1', 'user-1');
      expect(result).toEqual(openTicket);
    });

    it('should hide a ticket owned by someone else as not found', async () => {
      mockTicketRepository.findById.mockResolvedValue({ ...openTicket, userId: 'someone-else' });

      await expect(service.getForUser('ticket-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for an unknown ticket', async () => {
      mockTicketRepository.findById.mockResolvedValue(null);

      await expect(service.getForUser('unknown', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('replyAsUser', () => {
    it('should add a message and move WAITING_USER back to IN_PROGRESS', async () => {
      mockTicketRepository.findById.mockResolvedValue({ ...openTicket, status: 'WAITING_USER' });
      mockTicketRepository.update.mockResolvedValue({ ...openTicket, status: 'IN_PROGRESS' });

      const result = await service.replyAsUser('ticket-1', 'user-1', { message: 'Here is more info' });

      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ senderId: 'user-1', senderType: 'USER', internalNote: false }),
      );
      expect(mockTicketRepository.update).toHaveBeenCalledWith('ticket-1', { status: 'IN_PROGRESS' });
      expect(result).toHaveProperty('status', 'IN_PROGRESS');
    });

    it('should leave OPEN as OPEN when the owner replies before staff picks it up', async () => {
      mockTicketRepository.findById.mockResolvedValue(openTicket);
      mockTicketRepository.update.mockResolvedValue(openTicket);

      await service.replyAsUser('ticket-1', 'user-1', { message: 'Any update?' });
      expect(mockTicketRepository.update).toHaveBeenCalledWith('ticket-1', { status: 'OPEN' });
    });

    it('should reject replying to a closed ticket', async () => {
      mockTicketRepository.findById.mockResolvedValue({ ...openTicket, status: 'CLOSED' });

      await expect(service.replyAsUser('ticket-1', 'user-1', { message: 'Hello?' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getForMerchant', () => {
    it('should hide a ticket owned by a different merchant as not found', async () => {
      mockTicketRepository.findById.mockResolvedValue({ ...openTicket, userId: null, merchantId: 'other-merchant' });

      await expect(service.getForMerchant('ticket-1', 'merchant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('replyAsAdmin', () => {
    it('should reply, hand the ticket back to WAITING_USER, and assign it if unassigned', async () => {
      mockTicketRepository.findById.mockResolvedValue(openTicket);
      mockTicketRepository.update.mockResolvedValue({ ...openTicket, status: 'WAITING_USER', assignedToId: 'admin-1' });

      const result = await service.replyAsAdmin('ticket-1', 'admin-1', { message: 'We are looking into it' });

      expect(mockMessageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ senderType: 'ADMIN', internalNote: false }),
      );
      expect(mockTicketRepository.update).toHaveBeenCalledWith('ticket-1', { status: 'WAITING_USER', assignedToId: 'admin-1' });
      expect(result).toHaveProperty('status', 'WAITING_USER');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', entity: 'SupportTicket', action: 'UPDATE' }),
      );
    });

    it('should not change status for an internal note', async () => {
      mockTicketRepository.findById.mockResolvedValue({ ...openTicket, status: 'IN_PROGRESS' });
      mockTicketRepository.update.mockResolvedValue({ ...openTicket, status: 'IN_PROGRESS' });

      await service.replyAsAdmin('ticket-1', 'admin-1', { message: 'Internal context', internalNote: true });
      expect(mockTicketRepository.update).toHaveBeenCalledWith('ticket-1', { status: 'IN_PROGRESS', assignedToId: 'admin-1' });
    });

    it('should reject replying to a resolved ticket', async () => {
      mockTicketRepository.findById.mockResolvedValue({ ...openTicket, status: 'RESOLVED' });

      await expect(service.replyAsAdmin('ticket-1', 'admin-1', { message: 'x' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should stamp resolvedAt when moving to RESOLVED', async () => {
      mockTicketRepository.findById.mockResolvedValue(openTicket);
      mockTicketRepository.update.mockResolvedValue({ ...openTicket, status: 'RESOLVED' });

      await service.updateStatus('ticket-1', 'admin-1', { status: 'RESOLVED' });
      expect(mockTicketRepository.update).toHaveBeenCalledWith('ticket-1', {
        status: 'RESOLVED',
        resolvedAt: expect.any(Date),
      });
    });

    it('should clear resolvedAt/closedAt when reopening', async () => {
      mockTicketRepository.findById.mockResolvedValue({ ...openTicket, status: 'RESOLVED' });
      mockTicketRepository.update.mockResolvedValue({ ...openTicket, status: 'IN_PROGRESS' });

      await service.updateStatus('ticket-1', 'admin-1', { status: 'IN_PROGRESS' });
      expect(mockTicketRepository.update).toHaveBeenCalledWith('ticket-1', {
        status: 'IN_PROGRESS',
        resolvedAt: null,
        closedAt: null,
      });
    });
  });

  describe('assign', () => {
    it('should set assignedToId and move status to ASSIGNED', async () => {
      mockTicketRepository.findById.mockResolvedValue(openTicket);
      mockTicketRepository.update.mockResolvedValue({ ...openTicket, assignedToId: 'admin-2', status: 'ASSIGNED' });

      await service.assign('ticket-1', 'admin-1', { assignedToId: 'admin-2' });
      expect(mockTicketRepository.update).toHaveBeenCalledWith('ticket-1', { assignedToId: 'admin-2', status: 'ASSIGNED' });
    });
  });

  describe('listAll', () => {
    it('should delegate to the repository with all filters', async () => {
      mockTicketRepository.findAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 });

      await service.listAll({ page: 1, limit: 20, status: 'OPEN' } as never);
      expect(mockTicketRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20, status: 'OPEN' }),
      );
    });
  });
});
