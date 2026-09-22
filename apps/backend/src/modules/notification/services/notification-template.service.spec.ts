import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { NotificationTemplateRepository } from '../repositories';

import { NotificationTemplateService } from './notification-template.service';

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;

  const mockRepository = {
    list: jest.fn(),
    findById: jest.fn(),
    slugExists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  const existing = { id: 't1', name: 'Happy hour', slug: 'happy-hour', title: 'Happy hour!', body: 'Hi {{firstName}}', isActive: true };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        { provide: NotificationTemplateRepository, useValue: mockRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<NotificationTemplateService>(NotificationTemplateService);
    jest.clearAllMocks();
    mockRepository.slugExists.mockResolvedValue(false);
    mockRepository.create.mockImplementation(async (data) => ({ id: 't-new', ...data }));
    mockRepository.findById.mockResolvedValue(existing);
    mockRepository.update.mockImplementation(async (_id, data) => ({ ...existing, ...data }));
  });

  describe('create', () => {
    const input = { name: 'Weekend bonus', title: 'Weekend!', body: 'Hi {{firstName}}, the weekend is here.' };

    it('makes a readable slug from the name, defaults to in-app and active, and audits it', async () => {
      const created = await service.create(input, 'admin-1');

      expect(created).toEqual(expect.objectContaining({ slug: 'weekend-bonus', channel: 'IN_APP', isActive: true, variables: ['firstName'] }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: 'admin-1', entity: 'NotificationTemplate', action: 'CREATE' }),
      );
    });

    it('adds a number when the slug is taken, so two templates can share a name', async () => {
      mockRepository.slugExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      const created = await service.create(input, 'admin-1');

      expect(created.slug).toBe('weekend-bonus-3');
    });

    it('falls back to a generic slug when the name has no letters or digits', async () => {
      const created = await service.create({ ...input, name: '!!!' }, 'admin-1');

      expect(created.slug).toBe('template');
    });

    it('gives up with a clear message rather than looping forever', async () => {
      mockRepository.slugExists.mockResolvedValue(true);

      await expect(service.create(input, 'admin-1')).rejects.toThrow(/unique identifier/i);
    });

    it('rejects a placeholder that cannot be filled in', async () => {
      await expect(service.create({ ...input, body: 'You earned {{amount}}' }, 'admin-1')).rejects.toThrow(/\{\{amount\}\}/);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('checks the email subject too', async () => {
      await expect(service.create({ ...input, subject: 'Hello {{city}}' }, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('keeps the channel the admin chose', async () => {
      const created = await service.create({ ...input, channel: 'PUSH' }, 'admin-1');

      expect(created.channel).toBe('PUSH');
    });
  });

  describe('update', () => {
    it('changes only what was sent, and audits before and after', async () => {
      await service.update('t1', { title: 'Happy hour, now!' }, 'admin-1');

      expect(mockRepository.update).toHaveBeenCalledWith('t1', expect.objectContaining({ title: 'Happy hour, now!' }));
      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE', before: expect.objectContaining({ title: 'Happy hour!' }) }),
      );
    });

    it('rejects a bad placeholder in the new text', async () => {
      await expect(service.update('t1', { body: 'Bonus {{amount}}' }, 'admin-1')).rejects.toThrow(/\{\{amount\}\}/);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown template', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'x' }, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft deletes and audits it', async () => {
      await expect(service.remove('t1', 'admin-1')).resolves.toEqual({ id: 't1' });

      expect(mockRepository.softDelete).toHaveBeenCalledWith('t1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', entityId: 't1' }));
    });

    it('throws NotFoundException for an unknown template, deleting nothing', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.remove('missing', 'admin-1')).rejects.toThrow(NotFoundException);
      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('list and getById', () => {
    it('lists templates', async () => {
      mockRepository.list.mockResolvedValue([existing]);

      await expect(service.list()).resolves.toEqual([existing]);
    });

    it('throws NotFoundException for an unknown template', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
