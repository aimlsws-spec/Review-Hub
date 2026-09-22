import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { BroadcastQueryDto, CreateBroadcastDto } from '../dto';
import { BroadcastAudienceRepository, NotificationBroadcastRepository } from '../repositories';

import { BroadcastFanOutService } from './broadcast-fan-out.service';
import { BroadcastService } from './broadcast.service';

describe('BroadcastService', () => {
  let service: BroadcastService;

  const mockBroadcastRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    cancelIfScheduled: jest.fn(),
    deliveryBreakdown: jest.fn(),
  };
  const mockAudienceRepository = { reach: jest.fn(), listLocations: jest.fn() };
  const mockFanOutService = { enqueue: jest.fn() };
  const mockAuditLogService = { record: jest.fn() };

  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const inFuture = (ms: number) => new Date(Date.now() + ms).toISOString();

  const reach = { total: 120, byChannel: { IN_APP: 118, PUSH: 90, EMAIL: 100 } };
  const stored = {
    id: 'b1',
    title: 'Happy hour!',
    message: 'Hi {{firstName}}',
    type: 'PROMOTIONAL',
    channels: ['IN_APP', 'PUSH'],
    audience: { cityIds: ['c1'] },
    status: 'SCHEDULED',
    scheduledAt: new Date(),
    startedAt: null,
    completedAt: null,
    recipientCount: 0,
    smartTiming: false,
    failureReason: null,
    createdAt: new Date(),
    createdBy: { id: 'admin-1', firstName: 'Asha', lastName: 'Rao' },
  };

  const dto = (overrides: Partial<CreateBroadcastDto> = {}) =>
    Object.assign(new CreateBroadcastDto(), {
      title: 'Happy hour!',
      message: 'Hi {{firstName}}, tasks are live.',
      channels: ['IN_APP', 'PUSH'],
      audience: { cityIds: ['c1'] },
      ...overrides,
    }) as CreateBroadcastDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BroadcastService,
        { provide: NotificationBroadcastRepository, useValue: mockBroadcastRepository },
        { provide: BroadcastAudienceRepository, useValue: mockAudienceRepository },
        { provide: BroadcastFanOutService, useValue: mockFanOutService },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<BroadcastService>(BroadcastService);
    jest.clearAllMocks();
    mockAudienceRepository.reach.mockResolvedValue(reach);
    mockBroadcastRepository.create.mockResolvedValue(stored);
    mockBroadcastRepository.findById.mockResolvedValue(stored);
  });

  describe('create — sending now', () => {
    it('stores the broadcast, audits it and starts sending immediately', async () => {
      const result = await service.create(dto(), 'admin-1');

      expect(mockBroadcastRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdById: 'admin-1',
          title: 'Happy hour!',
          type: 'PROMOTIONAL',
          channels: ['IN_APP', 'PUSH'],
          audience: { cityIds: ['c1'] },
          scheduledAt: expect.any(Date),
        }),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', entity: 'NotificationBroadcast', action: 'CREATE' }),
      );
      expect(mockFanOutService.enqueue).toHaveBeenCalledWith('b1');
      expect(result).toEqual(expect.objectContaining({ id: 'b1', createdBy: { id: 'admin-1', name: 'Asha Rao' } }));
    });

    it('keeps the type the admin chose', async () => {
      await service.create(dto({ type: 'CAMPAIGN' }), 'admin-1');

      expect(mockBroadcastRepository.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'CAMPAIGN' }));
    });
  });

  describe('create — smart timing', () => {
    it('stores the choice, audits it and reports it back', async () => {
      mockBroadcastRepository.create.mockResolvedValue({ ...stored, smartTiming: true });

      const result = await service.create(dto({ smartTiming: true }), 'admin-1');

      expect(mockBroadcastRepository.create).toHaveBeenCalledWith(expect.objectContaining({ smartTiming: true }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ after: expect.objectContaining({ smartTiming: true }) }),
      );
      expect(result.smartTiming).toBe(true);
    });

    it('is off unless asked for', async () => {
      await service.create(dto(), 'admin-1');

      expect(mockBroadcastRepository.create).toHaveBeenCalledWith(expect.objectContaining({ smartTiming: false }));
    });

    it('is allowed for promotions and campaigns', async () => {
      await expect(service.create(dto({ smartTiming: true, type: 'PROMOTIONAL' }), 'admin-1')).resolves.toBeDefined();
      await expect(service.create(dto({ smartTiming: true, type: 'CAMPAIGN' }), 'admin-1')).resolves.toBeDefined();
    });

    it('is refused for a system announcement, which must go straight away', async () => {
      await expect(service.create(dto({ smartTiming: true, type: 'SYSTEM' }), 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(mockBroadcastRepository.create).not.toHaveBeenCalled();
    });

    it('does not stop a system announcement that is not using smart timing', async () => {
      await expect(service.create(dto({ type: 'SYSTEM' }), 'admin-1')).resolves.toBeDefined();
    });
  });

  describe('create — scheduling', () => {
    it('stores the chosen time and leaves the once-a-minute check to start it', async () => {
      const scheduledAt = inFuture(2 * HOUR);

      await service.create(dto({ scheduledAt }), 'admin-1');

      expect(mockBroadcastRepository.create).toHaveBeenCalledWith(expect.objectContaining({ scheduledAt: new Date(scheduledAt) }));
      expect(mockFanOutService.enqueue).not.toHaveBeenCalled();
    });

    it('refuses a time under a minute away, which is far more likely a mistake than a plan', async () => {
      await expect(service.create(dto({ scheduledAt: inFuture(20_000) }), 'admin-1')).rejects.toThrow(/at least one minute/i);
      expect(mockBroadcastRepository.create).not.toHaveBeenCalled();
    });

    it('refuses a time in the past', async () => {
      await expect(service.create(dto({ scheduledAt: inFuture(-HOUR) }), 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('refuses a time more than 90 days away', async () => {
      await expect(service.create(dto({ scheduledAt: inFuture(91 * DAY) }), 'admin-1')).rejects.toThrow(/90 days/);
    });

    it('accepts a time just inside the limits', async () => {
      await expect(service.create(dto({ scheduledAt: inFuture(89 * DAY) }), 'admin-1')).resolves.toBeDefined();
      await expect(service.create(dto({ scheduledAt: inFuture(2 * 60_000) }), 'admin-1')).resolves.toBeDefined();
    });
  });

  describe('create — refusing a send that would go nowhere', () => {
    it('rejects an audience that matches nobody', async () => {
      mockAudienceRepository.reach.mockResolvedValue({ total: 0, byChannel: { IN_APP: 0, PUSH: 0, EMAIL: 0 } });

      await expect(service.create(dto(), 'admin-1')).rejects.toThrow('No users match this audience');
      expect(mockBroadcastRepository.create).not.toHaveBeenCalled();
      expect(mockFanOutService.enqueue).not.toHaveBeenCalled();
    });

    it('rejects a push-only send when nobody in the audience has a device registered', async () => {
      mockAudienceRepository.reach.mockResolvedValue({ total: 50, byChannel: { IN_APP: 50, PUSH: 0, EMAIL: 40 } });

      await expect(service.create(dto({ channels: ['PUSH'] }), 'admin-1')).rejects.toThrow(/none of the selected channels/i);
    });

    it('accepts a send when at least one selected channel can reach someone', async () => {
      mockAudienceRepository.reach.mockResolvedValue({ total: 50, byChannel: { IN_APP: 50, PUSH: 0, EMAIL: 0 } });

      await expect(service.create(dto({ channels: ['PUSH', 'IN_APP'] }), 'admin-1')).resolves.toBeDefined();
    });
  });

  describe('create — validating the content', () => {
    it('rejects a placeholder that would reach users as literal text', async () => {
      await expect(service.create(dto({ message: 'You earned {{amount}}' }), 'admin-1')).rejects.toThrow(/\{\{amount\}\}/);
      expect(mockBroadcastRepository.create).not.toHaveBeenCalled();
    });

    it('rejects an unsupported placeholder in the title too', async () => {
      await expect(service.create(dto({ title: 'Hi {{name}}' }), 'admin-1')).rejects.toThrow(/\{\{name\}\}/);
    });

    it('rejects a minimum age above the maximum', async () => {
      await expect(service.create(dto({ audience: { minAge: 40, maxAge: 20 } }), 'admin-1')).rejects.toThrow(/minimum age/i);
    });

    it('rejects a minimum level above the maximum', async () => {
      await expect(service.create(dto({ audience: { minLevel: 9, maxLevel: 2 } }), 'admin-1')).rejects.toThrow(/minimum level/i);
    });
  });

  describe('previewAudience', () => {
    it('returns the reach without creating or sending anything', async () => {
      await expect(service.previewAudience({ cityIds: ['c1'] })).resolves.toEqual(reach);

      expect(mockBroadcastRepository.create).not.toHaveBeenCalled();
      expect(mockFanOutService.enqueue).not.toHaveBeenCalled();
    });

    it('applies the same sanity checks as sending', async () => {
      await expect(service.previewAudience({ minAge: 50, maxAge: 18 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('list and getById', () => {
    it('lists broadcasts with paging info', async () => {
      mockBroadcastRepository.list.mockResolvedValue({ data: [stored], total: 1 });
      const query = Object.assign(new BroadcastQueryDto(), { page: 2, limit: 10, status: 'SENT' });

      const result = await service.list(query);

      expect(mockBroadcastRepository.list).toHaveBeenCalledWith({ status: 'SENT', skip: 10, take: 10 });
      expect(result).toEqual({ data: [expect.objectContaining({ id: 'b1' })], total: 1, page: 2, limit: 10 });
    });

    it('returns one broadcast with how its messages fared', async () => {
      mockBroadcastRepository.deliveryBreakdown.mockResolvedValue([{ channel: 'PUSH', status: 'SENT', count: 90 }]);

      const result = await service.getById('b1');

      expect(result).toEqual(expect.objectContaining({ id: 'b1', deliveries: [{ channel: 'PUSH', status: 'SENT', count: 90 }] }));
    });

    it('throws NotFoundException for an unknown broadcast', async () => {
      mockBroadcastRepository.findById.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('cancels a scheduled broadcast and audits the change', async () => {
      mockBroadcastRepository.cancelIfScheduled.mockResolvedValue(true);
      mockBroadcastRepository.findById.mockResolvedValue({ ...stored, status: 'CANCELLED' });

      const result = await service.cancel('b1', 'admin-1');

      expect(result.status).toBe('CANCELLED');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STATUS_CHANGE', before: { status: 'SCHEDULED' }, after: { status: 'CANCELLED' } }),
      );
    });

    it('explains why a broadcast that already started cannot be cancelled, and audits nothing', async () => {
      mockBroadcastRepository.cancelIfScheduled.mockResolvedValue(false);

      await expect(service.cancel('b1', 'admin-1')).rejects.toThrow(/already started or finished/i);
      expect(mockAuditLogService.record).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown broadcast', async () => {
      mockBroadcastRepository.findById.mockResolvedValue(null);

      await expect(service.cancel('missing', 'admin-1')).rejects.toThrow(NotFoundException);
      expect(mockBroadcastRepository.cancelIfScheduled).not.toHaveBeenCalled();
    });
  });

  describe('listLocations', () => {
    it('hands back the states and cities for the pickers', async () => {
      mockAudienceRepository.listLocations.mockResolvedValue([{ id: 's1', name: 'Gujarat', cities: [] }]);

      await expect(service.listLocations()).resolves.toEqual([{ id: 's1', name: 'Gujarat', cities: [] }]);
    });
  });
});
