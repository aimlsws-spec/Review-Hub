import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../database/prisma/prisma.service';

import { DuplicateImageRepository } from './duplicate-image.repository';

describe('DuplicateImageRepository', () => {
  let repository: DuplicateImageRepository;

  const mockPrisma = {
    submissionAttachment: { updateMany: jest.fn() },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DuplicateImageRepository, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<DuplicateImageRepository>(DuplicateImageRepository);
    jest.clearAllMocks();
  });

  describe('saveFingerprint', () => {
    it("records the hash and the words on the submission's evidence file", async () => {
      await repository.saveFingerprint('sub-1', 123n, 'follow the brand');

      expect(mockPrisma.submissionAttachment.updateMany).toHaveBeenCalledWith({
        where: { submissionId: 'sub-1' },
        data: { perceptualHash: 123n, evidenceText: 'follow the brand' },
      });
    });

    it('stores "OCR did not run" as null, distinct from "no text found" (empty string)', async () => {
      await repository.saveFingerprint('sub-1', 1n, null);
      await repository.saveFingerprint('sub-2', 1n, '');

      expect(mockPrisma.submissionAttachment.updateMany.mock.calls[0][0].data.evidenceText).toBeNull();
      expect(mockPrisma.submissionAttachment.updateMany.mock.calls[1][0].data.evidenceText).toBe('');
    });
  });

  describe('findSimilar', () => {
    const params = { submissionId: 'sub-1', perceptualHash: -42n, maxDistance: 6, since: new Date('2026-06-01T00:00:00Z'), limit: 5 };

    it('turns the database counts into plain numbers', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        { submissionId: 'sub-2', userId: 'user-2', evidenceText: 'follow the brand', distance: 2n },
        { submissionId: 'sub-3', userId: 'user-3', evidenceText: null, distance: 5 },
      ]);

      const rows = await repository.findSimilar(params);

      expect(rows).toEqual([
        { submissionId: 'sub-2', userId: 'user-2', evidenceText: 'follow the brand', distance: 2 },
        { submissionId: 'sub-3', userId: 'user-3', evidenceText: null, distance: 5 },
      ]);
      expect(typeof rows[0].distance).toBe('number');
    });

    it('passes every filter as a bound parameter, never spliced into the SQL', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await repository.findSimilar(params);

      const query = mockPrisma.$queryRaw.mock.calls[0][0];
      // Prisma.sql keeps the values apart from the text: hash (twice), submission id, cutoff, max distance, limit.
      expect(query.values).toEqual([-42n, 'sub-1', params.since, -42n, 6, 5]);
      expect(query.strings.join('?')).not.toContain('sub-1');
    });

    it('compares in the database with BIT_COUNT, excluding itself, deleted submissions and old pictures', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await repository.findSimilar(params);

      const sql = mockPrisma.$queryRaw.mock.calls[0][0].strings.join('?');
      expect(sql).toMatch(/BIT_COUNT\(a\.perceptualHash \^ \?\)/);
      expect(sql).toMatch(/a\.perceptualHash IS NOT NULL/);
      expect(sql).toMatch(/a\.submissionId <> \?/);
      expect(sql).toMatch(/a\.createdAt >= \?/);
      expect(sql).toMatch(/s\.deletedAt IS NULL/);
      expect(sql).toMatch(/ORDER BY distance ASC/);
      expect(sql).toMatch(/LIMIT \?/);
    });
  });
});
