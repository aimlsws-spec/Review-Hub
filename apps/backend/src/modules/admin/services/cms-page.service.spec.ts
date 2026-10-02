import { Test, TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@common/exceptions/domain.exceptions';

import { AuditLogService } from '../../../shared/audit/audit-log.service';
import { CmsPageRepository } from '../repositories';

import { CmsPageService } from './cms-page.service';

describe('CmsPageService', () => {
  let service: CmsPageService;

  const mockCmsPageRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    findPublishedBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockAuditLogService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsPageService,
        { provide: CmsPageRepository, useValue: mockCmsPageRepository },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<CmsPageService>(CmsPageService);
    jest.clearAllMocks();
  });

  describe('getPublishedBySlug', () => {
    it('returns only what a reader needs from a published page', async () => {
      const publishedAt = new Date('2026-10-01T00:00:00Z');
      const updatedAt = new Date('2026-10-02T00:00:00Z');
      mockCmsPageRepository.findPublishedBySlug.mockResolvedValue({
        id: 'page-1',
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: 'We keep your data safe.',
        status: 'PUBLISHED',
        createdBy: 'admin-1',
        publishedAt,
        updatedAt,
      });

      await expect(service.getPublishedBySlug('privacy-policy')).resolves.toEqual({
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        content: 'We keep your data safe.',
        publishedAt,
        updatedAt,
      });
    });

    it('treats a draft or missing page as not found', async () => {
      mockCmsPageRepository.findPublishedBySlug.mockResolvedValue(null);

      await expect(service.getPublishedBySlug('terms-and-conditions')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should reject a duplicate slug', async () => {
      mockCmsPageRepository.findBySlug.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ title: 'About', slug: 'about', content: 'Some content here' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default to DRAFT status and set publishedAt only when publishing immediately', async () => {
      mockCmsPageRepository.findBySlug.mockResolvedValue(null);
      mockCmsPageRepository.create.mockResolvedValue({ id: 'page-1', title: 'About', slug: 'about', status: 'DRAFT' });

      await service.create({ title: 'About', slug: 'about', content: 'Some content here' }, 'admin-1');

      expect(mockCmsPageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'DRAFT', publishedAt: undefined, createdBy: 'admin-1' }),
      );
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE' }));
    });
  });

  describe('update', () => {
    it('should stamp publishedAt when a page transitions to PUBLISHED', async () => {
      mockCmsPageRepository.findById.mockResolvedValue({ id: 'page-1', status: 'DRAFT' });
      mockCmsPageRepository.update.mockResolvedValue({ id: 'page-1', status: 'PUBLISHED' });

      await service.update('page-1', { status: 'PUBLISHED' }, 'admin-1');

      expect(mockCmsPageRepository.update).toHaveBeenCalledWith(
        'page-1',
        expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }),
      );
    });

    it('should throw NotFoundException for an unknown page', async () => {
      mockCmsPageRepository.findById.mockResolvedValue(null);

      await expect(service.update('unknown', {}, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete and audit', async () => {
      mockCmsPageRepository.findById.mockResolvedValue({ id: 'page-1', status: 'DRAFT' });
      mockCmsPageRepository.softDelete.mockResolvedValue({ id: 'page-1', deletedAt: new Date() });

      await service.remove('page-1', 'admin-1');
      expect(mockAuditLogService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });
  });
});
