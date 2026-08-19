import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { SupportTicketRepository } from './support-ticket.repository';

describe('SupportTicketRepository', () => {
  let repository: SupportTicketRepository;

  const mockPrisma = {
    supportTicket: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportTicketRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<SupportTicketRepository>(SupportTicketRepository);
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should include the message thread ordered oldest first', async () => {
      mockPrisma.supportTicket.findFirst.mockResolvedValue({ id: 'ticket-1' });

      await repository.findById('ticket-1');
      expect(mockPrisma.supportTicket.findFirst).toHaveBeenCalledWith({
        where: { id: 'ticket-1', deletedAt: null },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    });
  });

  describe('findByUser', () => {
    it('should scope to the user and filter by status when given', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([{ id: 'ticket-1' }]);
      mockPrisma.supportTicket.count.mockResolvedValue(1);

      const result = await repository.findByUser({ userId: 'user-1', page: 1, limit: 20, status: 'OPEN' });
      expect(result.data).toHaveLength(1);
      expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', deletedAt: null, status: 'OPEN' } }),
      );
    });
  });

  describe('findByMerchant', () => {
    it('should scope to the merchant', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([]);
      mockPrisma.supportTicket.count.mockResolvedValue(0);

      await repository.findByMerchant({ merchantId: 'merchant-1', page: 1, limit: 20 });
      expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { merchantId: 'merchant-1', deletedAt: null } }),
      );
    });
  });

  describe('findAll', () => {
    it('should apply status, category, and priority filters together', async () => {
      mockPrisma.supportTicket.findMany.mockResolvedValue([]);
      mockPrisma.supportTicket.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 20, status: 'OPEN', category: 'PAYMENT', priority: 'HIGH' });
      expect(mockPrisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, status: 'OPEN', category: 'PAYMENT', priority: 'HIGH' },
        }),
      );
    });
  });
});
