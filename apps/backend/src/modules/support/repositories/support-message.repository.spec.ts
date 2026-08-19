import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { SupportMessageRepository } from './support-message.repository';

describe('SupportMessageRepository', () => {
  let repository: SupportMessageRepository;

  const mockPrisma = {
    supportMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportMessageRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<SupportMessageRepository>(SupportMessageRepository);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a message', async () => {
      mockPrisma.supportMessage.create.mockResolvedValue({ id: 'msg-1' });

      const data = { ticket: { connect: { id: 'ticket-1' } }, senderId: 'user-1', senderType: 'USER', message: 'Help please' };
      const result = await repository.create(data as never);
      expect(result).toHaveProperty('id', 'msg-1');
      expect(mockPrisma.supportMessage.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('findByTicket', () => {
    it('should list messages oldest first', async () => {
      mockPrisma.supportMessage.findMany.mockResolvedValue([{ id: 'msg-1' }]);

      const result = await repository.findByTicket('ticket-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.supportMessage.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });
});
